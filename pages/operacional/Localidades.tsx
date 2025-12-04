import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { MapPin, Plus, Edit2, Trash2 } from 'lucide-react';
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
      const q = query(collection(db, 'localidades'), where('active', '==', true));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Localidade));
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

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente desativar esta localidade?')) return;

    try {
      await updateDoc(doc(db, 'localidades', id), { active: false });
      setMessageType('success');
      setMessage('Localidade desativada com sucesso!');
      loadLocalidades();
    } catch (error: any) {
      console.error('Erro ao desativar localidade:', error);
      setMessageType('error');
      setMessage(error?.message || 'Erro ao desativar localidade');
    }
  };

  const isAuthorized = userProfile && ['admin', 'gerente'].includes(userProfile.role);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader 
        title="Gestão de Localidades"
        subtitle="Crie e gerencie todas as localidades do sistema"
        action={
          <button
            onClick={handleOpenModal}
            disabled={!isAuthorized}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 disabled:opacity-60"
          >
            <Plus size={20} /> Nova Localidade
          </button>
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
                  <th className="px-6 py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Código</th>
                  <th className="px-6 py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Nome</th>
                  <th className="px-6 py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {localidades.map((localidade) => (
                  <tr key={localidade.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-2.5 font-mono font-semibold text-slate-900">
                      {localidade.codigo || <span className="text-slate-400 italic">sem código</span>}
                    </td>
                    <td className="px-6 py-2.5 font-medium text-slate-900 flex items-center gap-3">
                      <div className="p-2 bg-blue-100/50 rounded-lg">
                        <MapPin className="text-blue-600" size={18} />
                      </div>
                      {localidade.nome}
                    </td>
                    <td className="px-6 py-2.5 text-right flex justify-end gap-3">
                      <button
                        onClick={() => handleEdit(localidade)}
                        disabled={!isAuthorized}
                        className="text-blue-500 hover:text-blue-700 font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <Edit2 size={16} /> Editar
                      </button>
                      <button
                        onClick={() => handleDelete(localidade.id)}
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
