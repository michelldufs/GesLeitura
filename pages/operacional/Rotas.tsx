import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { Route as RouteIcon, Plus, Edit2, Trash2 } from 'lucide-react';
import { GlassCard, ButtonPrimary, ButtonSecondary, InputField, SelectField, AlertBox, Modal, PageHeader } from '../../components/MacOSDesign';

interface Rota {
  id: string;
  nome: string;
  secaoId: string;
  localidadeId: string;
  active: boolean;
}

interface Secao {
  id: string;
  nome: string;
  localidadeId: string;
}

interface Localidade {
  id: string;
  nome: string;
}

const Rotas: React.FC = () => {
  const { userProfile } = useAuth();
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [secoes, setSecoes] = useState<Secao[]>([]);
  const [localidades, setLocalidades] = useState<Localidade[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const [formData, setFormData] = useState({
    nome: '',
    localidadeId: '',
    secaoId: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const locQuery = query(collection(db, 'localidades'), where('active', '==', true));
      const locSnapshot = await getDocs(locQuery);
      setLocalidades(locSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Localidade)));

      const secQuery = query(collection(db, 'secoes'), where('active', '==', true));
      const secSnapshot = await getDocs(secQuery);
      setSecoes(secSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Secao)));

      const rotQuery = query(collection(db, 'rotas'), where('active', '==', true));
      const rotSnapshot = await getDocs(rotQuery);
      setRotas(rotSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rota)));
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const handleOpenModal = () => {
    setFormData({ nome: '', localidadeId: '', secaoId: '' });
    setEditingId(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ nome: '', localidadeId: '', secaoId: '' });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim() || !formData.secaoId || !formData.localidadeId) return;

    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      if (editingId) {
        await updateDoc(doc(db, 'rotas', editingId), {
          nome: formData.nome,
          secaoId: formData.secaoId,
          localidadeId: formData.localidadeId
        });
        setMessageType('success');
        setMessage('Rota atualizada com sucesso!');
      } else {
        await addDoc(collection(db, 'rotas'), {
          nome: formData.nome,
          secaoId: formData.secaoId,
          localidadeId: formData.localidadeId,
          active: true
        });
        setMessageType('success');
        setMessage('Rota criada com sucesso!');
      }
      handleCloseModal();
      loadData();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      setMessageType('error');
      setMessage(error?.message || 'Erro ao salvar rota');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rota: Rota) => {
    setFormData({ nome: rota.nome, localidadeId: rota.localidadeId, secaoId: rota.secaoId });
    setEditingId(rota.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente desativar esta rota?')) return;

    try {
      await updateDoc(doc(db, 'rotas', id), { active: false });
      setMessageType('success');
      setMessage('Rota desativada com sucesso!');
      loadData();
    } catch (error: any) {
      console.error('Erro ao desativar:', error);
      setMessageType('error');
      setMessage(error?.message || 'Erro ao desativar rota');
    }
  };

  const isAuthorized = userProfile && ['admin', 'gerente'].includes(userProfile.role);
  const filteredSecoes = secoes.filter(s => s.localidadeId === formData.localidadeId);
  const getLocalidadeNome = (id: string) => localidades.find(l => l.id === id)?.nome || 'N/A';
  const getSecaoNome = (id: string) => secoes.find(s => s.id === id)?.nome || 'N/A';

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader 
        title="Gestão de Rotas"
        subtitle="Crie e gerencie todas as rotas do sistema"
        action={
          <button
            onClick={handleOpenModal}
            disabled={!isAuthorized}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 disabled:opacity-60"
          >
            <Plus size={20} /> Nova Rota
          </button>
        }
      />

      {!isAuthorized && (
        <AlertBox 
          type="warning"
          message={`Seu perfil (${userProfile?.role}) não possui permissão para gerenciar rotas.`}
        />
      )}

      {message && (
        <div className="mb-6">
          <AlertBox 
            type={messageType as 'success' | 'error' | 'warning' | 'info'}
            message={message}
          />
        </div>
      )}

      <GlassCard className="p-8">
        <h2 className="text-2xl font-semibold text-slate-900 mb-6">Rotas Cadastradas</h2>

        {rotas.length === 0 ? (
          <div className="text-center py-12">
            <RouteIcon className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 text-lg">Nenhuma rota cadastrada ainda.</p>
            <p className="text-slate-400 text-sm mt-2">Clique em "Nova Rota" para criar a primeira.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/50">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 border-b border-slate-200/50">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-700 text-xs uppercase tracking-wide">Nome</th>
                  <th className="px-6 py-4 font-semibold text-slate-700 text-xs uppercase tracking-wide">Localidade</th>
                  <th className="px-6 py-4 font-semibold text-slate-700 text-xs uppercase tracking-wide">Seção</th>
                  <th className="px-6 py-4 font-semibold text-slate-700 text-xs uppercase tracking-wide text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rotas.map((rota) => (
                  <tr key={rota.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                      <div className="p-2 bg-green-100/50 rounded-lg">
                        <RouteIcon className="text-green-600" size={18} />
                      </div>
                      {rota.nome}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{getLocalidadeNome(rota.localidadeId)}</td>
                    <td className="px-6 py-4 text-slate-600">{getSecaoNome(rota.secaoId)}</td>
                    <td className="px-6 py-4 text-right flex justify-end gap-3">
                      <button
                        onClick={() => handleEdit(rota)}
                        disabled={!isAuthorized}
                        className="text-blue-500 hover:text-blue-700 font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <Edit2 size={16} /> Editar
                      </button>
                      <button
                        onClick={() => handleDelete(rota.id)}
                        disabled={!isAuthorized}
                        className="text-red-500 hover:text-red-700 font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <Trash2 size={16} /> Desativar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Modal */}
      <Modal 
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingId ? 'Editar Rota' : 'Nova Rota'}
        actions={
          <div className="flex gap-3">
            <ButtonPrimary onClick={handleSubmit} disabled={loading} type="submit">
              {loading ? 'Salvando...' : 'Salvar'}
            </ButtonPrimary>
            <ButtonSecondary onClick={handleCloseModal}>
              Cancelar
            </ButtonSecondary>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <SelectField
            label="Localidade"
            value={formData.localidadeId}
            onChange={(e) => setFormData({ ...formData, localidadeId: e.target.value, secaoId: '' })}
            disabled={!isAuthorized}
            required
          >
            <option value="">Selecione a localidade</option>
            {localidades.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.nome}</option>
            ))}
          </SelectField>

          <SelectField
            label="Seção"
            value={formData.secaoId}
            onChange={(e) => setFormData({ ...formData, secaoId: e.target.value })}
            disabled={!isAuthorized || !formData.localidadeId}
            required
          >
            <option value="">Selecione a seção</option>
            {filteredSecoes.map(sec => (
              <option key={sec.id} value={sec.id}>{sec.nome}</option>
            ))}
          </SelectField>

          <InputField
            label="Nome da Rota"
            placeholder="Ex: Rota 01"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            disabled={!isAuthorized}
            required
          />
        </form>
      </Modal>
    </div>
  );
};

export default Rotas;
