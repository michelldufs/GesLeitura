import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { MapPin, Plus, Edit2, Trash2, Ban } from 'lucide-react';
import { Localidade } from '../../types';
import { GlassCard, ButtonPrimary, ButtonSecondary, InputField, AlertBox, Modal, PageHeader } from '../../components/MacOSDesign';

const Localidades: React.FC = () => {
  const { userProfile } = useAuth();
  const [localidades, setLocalidades] = useState<Localidade[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const [formData, setFormData] = useState({
    nome: ''
  });

  useEffect(() => {
    loadLocalidades();
  }, []);

  const loadLocalidades = async () => {
    try {
      const q = query(collection(db, 'localidades'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Localidade));
      // Ordenar por código crescente
      data.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
      setLocalidades(data);
    } catch (error) {
      console.error('Erro ao carregar localidades:', error);
    }
  };

  const gerarCodigoLocalidade = (): string => {
    // Encontrar próximo ID de localidade
    const proximoId = localidades.length + 1;
    return String(proximoId).padStart(2, '0');
  };

  const handleOpenModal = () => {
    setFormData({ nome: '' });
    setEditingId(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ nome: '' });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) return;

    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      if (editingId) {
        await updateDoc(doc(db, 'localidades', editingId), { nome: formData.nome.toUpperCase() });
        setMessageType('success');
        setMessage('Localidade atualizada com sucesso!');
      } else {
        const codigo = gerarCodigoLocalidade();
        await addDoc(collection(db, 'localidades'), {
          codigo,
          nome: formData.nome.toUpperCase(),
          active: true
        });
        setMessageType('success');
        setMessage('Localidade criada com sucesso!');
      }
      handleCloseModal();
      loadLocalidades();
    } catch (error: any) {
      console.error('Erro ao salvar localidade:', error);
      setMessageType('error');
      setMessage(error?.message || 'Erro ao salvar localidade');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (localidade: Localidade) => {
    setFormData({ nome: localidade.nome });
    setEditingId(localidade.id);
    setShowModal(true);
  };

  const handleToggleStatus = async (localidade: Localidade) => {
    const novoStatus = !localidade.active;
    const acao = novoStatus ? 'ativar' : 'desativar';
    if (!confirm(`Deseja realmente ${acao} esta localidade?`)) return;

    try {
      await updateDoc(doc(db, 'localidades', localidade.id), { active: novoStatus });
      setMessageType('success');
      setMessage(`Localidade ${novoStatus ? 'ativada' : 'desativada'} com sucesso!`);
      loadLocalidades();
    } catch (error: any) {
      console.error(`Erro ao ${acao} localidade:`, error);
      setMessageType('error');
      setMessage(error?.message || `Erro ao ${acao} localidade`);
    }
  };

  const isAuthorized = userProfile && ['admin', 'gerente'].includes(userProfile.role);

  return (
    <div className="w-full">
      <PageHeader
        title="Gestão de Localidades"
        subtitle="Crie e gerencie todas as localidades do sistema"
        action={
          <ButtonPrimary
            onClick={handleOpenModal}
            disabled={!isAuthorized}
            className="flex items-center gap-2"
          >
            <Plus size={20} /> Nova Localidade
          </ButtonPrimary>
        }
      />

      {!isAuthorized && (
        <AlertBox
          type="warning"
          message={`Seu perfil (${userProfile?.role}) não possui permissão para gerenciar localidades.`}
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
        <h2 className="text-2xl font-semibold text-slate-900 mb-6">Localidades Cadastradas</h2>

        {localidades.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 text-lg">Nenhuma localidade cadastrada ainda.</p>
            <p className="text-slate-400 text-sm mt-2">Clique em "Nova Localidade" para criar a primeira.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/50">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 border-b border-slate-200/50">
                <tr>
                  <th className="px-3 py-3 font-semibold text-slate-700 text-xs uppercase tracking-wide">Código</th>
                  <th className="px-3 py-3 font-semibold text-slate-700 text-xs uppercase tracking-wide">Nome</th>
                  <th className="px-3 py-3 font-semibold text-slate-700 text-xs uppercase tracking-wide text-center">Status</th>
                  <th className="px-3 py-3 font-semibold text-slate-700 text-xs uppercase tracking-wide text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {localidades.map((localidade) => (
                  <tr key={localidade.id} className={`hover:bg-slate-50/80 transition-colors ${!localidade.active ? 'opacity-50' : ''}`}>
                    <td className="px-3 py-3 font-mono font-semibold text-slate-900 text-sm">
                      {localidade.codigo || <span className="text-slate-400 italic text-xs">sem código</span>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100/50 rounded-lg flex-shrink-0">
                          <MapPin className="text-blue-600" size={16} />
                        </div>
                        <span className="font-medium text-slate-900 text-sm">{localidade.nome}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => handleToggleStatus(localidade)}
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          localidade.active 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                        title={localidade.active ? 'Clique para desativar' : 'Clique para ativar'}
                      >
                        {localidade.active ? '✓ Ativo' : '✕ Inativo'}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(localidade)}
                          disabled={!isAuthorized}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
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
        title={editingId ? 'Editar Localidade' : 'Nova Localidade'}
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
          {!editingId && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Código que será gerado:</span> {gerarCodigoLocalidade()}
              </p>
            </div>
          )}

          <InputField
            label="Nome da Localidade"
            placeholder="Ex: MATRIZ"
            value={formData.nome}
            onChange={(e) => setFormData({ nome: e.target.value.toUpperCase() })}
            disabled={!isAuthorized}
            required
            className="uppercase"
          />
        </form>
      </Modal>
    </div>
  );
};

export default Localidades;
