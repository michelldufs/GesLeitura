import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalidade } from '../../contexts/LocalidadeContext';
import { useSecoes, useCreateSecao, useUpdateSecao, useDeleteSecao } from '../../hooks/useSecoes';
import { Layers, Plus, Edit2, Trash2, Ban } from 'lucide-react';
import { GlassCard, AlertBox, PageHeader, ButtonPrimary, ButtonSecondary, Modal, SelectField, InputField, Badge } from '../../components/MacOSDesign';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { Secao, Localidade } from '../../types';

const Secoes: React.FC = () => {
  const { userProfile } = useAuth();
  const { selectedLocalidade } = useLocalidade();

  // React Query hooks
  const { data: secoes = [], isLoading: loadingSecoes, error, refetch } = useSecoes(selectedLocalidade);
  const createSecao = useCreateSecao();
  const updateSecao = useUpdateSecao();
  const deleteSecao = useDeleteSecao();

  const [localidades, setLocalidades] = useState<Localidade[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const [formData, setFormData] = useState({
    nome: '',
    localidadeId: ''
  });

  useEffect(() => {
    loadLocalidades();
  }, []);

  const loadLocalidades = async () => {
    try {
      const locQuery = query(collection(db, 'localidades'), where('active', '==', true));
      const locSnapshot = await getDocs(locQuery);
      const locData = locSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          codigo: data.codigo || '',
          nome: data.nome || ''
        } as Localidade;
      });
      setLocalidades(locData);
    } catch (error) {
      console.error('Erro ao carregar localidades:', error);
    }
  };

  const gerarCodigoSecao = (): string => {
    try {
      if (!formData.localidadeId) return '';

      // Encontrar seções desta localidade para gerar próximo código sequencial
      const secoesLocalidade = secoes.filter(s => s.localidadeId === formData.localidadeId);
      const proximoId = secoesLocalidade.length + 1;

      // Código da seção é apenas 2 dígitos (01, 02, 03...)
      return String(proximoId).padStart(2, '0');
    } catch (error) {
      console.error('Erro ao gerar código:', error);
      return '';
    }
  };

  const handleOpenModal = () => {
    // Pré-selecionar a localidade em que o usuário está logado (para todos, inclusive admin)
    setFormData({ nome: '', localidadeId: selectedLocalidade || '' });
    setEditingId(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ nome: '', localidadeId: '' });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim() || !formData.localidadeId) return;

    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      if (editingId) {
        await updateSecao.mutateAsync({
          id: editingId,
          data: {
            nome: formData.nome.toUpperCase(),
            localidadeId: formData.localidadeId
          }
        });
        setMessageType('success');
        setMessage('Seção atualizada com sucesso!');
      } else {
        const codigo = gerarCodigoSecao();
        const secaoData: any = {
          nome: formData.nome.toUpperCase(),
          localidadeId: formData.localidadeId,
          active: true
        };

        // Só adiciona código se foi gerado (localidade tem código)
        if (codigo) {
          secaoData.codigo = codigo;
        }

        await createSecao.mutateAsync(secaoData);
        setMessageType('success');
        setMessage('Seção criada com sucesso!');
      }
      handleCloseModal();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      setMessageType('error');
      setMessage(error?.message || 'Erro ao salvar seção');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (secao: Secao) => {
    console.log('handleEdit chamado com:', secao);
    setFormData({ nome: secao.nome, localidadeId: secao.localidadeId });
    setEditingId(secao.id);
    setShowModal(true);
  };

  const handleToggleStatus = async (secao: Secao) => {
    const novoStatus = !secao.active;
    const acao = novoStatus ? 'ativar' : 'desativar';
    if (!confirm(`Deseja realmente ${acao} esta seção?`)) return;

    try {
      await updateDoc(doc(db, 'secoes', secao.id), { active: novoStatus });
      setMessageType('success');
      setMessage(`Seção ${novoStatus ? 'ativada' : 'desativada'} com sucesso!`);
      refetch();
    } catch (error: any) {
      console.error(`Erro ao ${acao}:`, error);
      setMessageType('error');
      setMessage(error?.message || `Erro ao ${acao} seção`);
    }
  };

  const isAuthorized = userProfile && ['admin', 'gerente'].includes(userProfile.role);
  const getLocalidadeNome = (id: string) => localidades.find(l => l.id === id)?.nome || 'N/A';

  return (
    <div className="w-full">
      <PageHeader
        title="Gestão de Seções"
        subtitle="Crie e gerencie todas as seções do sistema"
        action={
          <ButtonPrimary
            onClick={handleOpenModal}
            disabled={!isAuthorized}
            className="flex items-center gap-2"
          >
            <Plus size={20} /> Nova Seção
          </ButtonPrimary>
        }
      />

      {!isAuthorized && (
        <AlertBox
          type="warning"
          message={`Seu perfil (${userProfile?.role}) não possui permissão para gerenciar seções.`}
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

      {/* Loading state */}
      {loadingSecoes && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          <p className="ml-4 text-gray-600">Carregando seções...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <AlertBox
          type="error"
          message="Erro ao carregar seções. Tente novamente."
        />
      )}

      {!loadingSecoes && !error && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-sm font-semibold text-gray-700">Seções Cadastradas</h2>
            <span className="text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200 shadow-sm">
              {secoes.length} registros
            </span>
          </div>

          {secoes.length === 0 ? (
            <div className="text-center py-12">
              <Layers className="mx-auto text-gray-300 mb-4" size={32} />
              <p className="text-gray-500 text-sm">Nenhuma seção cadastrada ainda.</p>
              <p className="text-gray-400 text-xs mt-2">Clique em "Nova Seção" para criar a primeira.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide">Código</th>
                    <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide">Nome</th>
                    <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide">Localidade</th>
                    <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide text-center">Status</th>
                    <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {secoes.map((secao) => (
                    <tr key={secao.id} className={`hover:bg-gray-50 transition-colors ${!secao.active ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-2 font-medium text-gray-700 text-xs">
                        {secao.codigo || '-'}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <Layers className="text-purple-500" size={14} />
                          <span className="font-medium text-gray-800 text-xs">{secao.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          {getLocalidadeNome(secao.localidadeId)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => handleToggleStatus(secao)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${secao.active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100'
                            }`}
                          title={secao.active ? 'Desativar' : 'Ativar'}
                        >
                          {secao.active ? 'ATIVO' : 'INATIVO'}
                        </button>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => handleEdit(secao)}
                          disabled={!isAuthorized}
                          className="p-1 text-gray-400 hover:text-emerald-600 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingId ? 'Editar Seção' : 'Nova Seção'}
        actions={
          <div className="flex gap-3">
            <ButtonPrimary
              onClick={handleSubmit}
              disabled={loading}
              type="submit"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </ButtonPrimary>
            <ButtonSecondary
              onClick={handleCloseModal}
            >
              Cancelar
            </ButtonSecondary>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <SelectField
            label="Localidade"
            value={formData.localidadeId}
            onChange={(e) => setFormData({ ...formData, localidadeId: e.target.value })}
            disabled={editingId ? true : false}
            required
            options={[
              { value: '', label: 'Selecione a localidade' },
              ...(localidades && localidades.length > 0 ? localidades.map(loc => ({
                value: loc.id,
                label: loc.codigo ? `${loc.codigo} - ${loc.nome}` : loc.nome
              })) : [])
            ]}
          />

          {!editingId && formData.localidadeId && localidades.length > 0 && (() => {
            const codigoGerado = gerarCodigoSecao();
            if (codigoGerado) {
              const localidade = localidades.find(l => l.id === formData.localidadeId);
              return (
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm text-purple-900">
                    <span className="font-semibold">Código que será gerado:</span> {codigoGerado}
                  </p>
                  <p className="text-xs text-purple-700 mt-1">
                    Vinculada à: {localidade?.codigo ? `${localidade.codigo} - ${localidade.nome}` : localidade?.nome}
                  </p>
                </div>
              );
            }
            return null;
          })()}

          <InputField
            label="Nome da Seção"
            placeholder="Ex: SEÇÃO A"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value.toUpperCase() })}
            disabled={!isAuthorized}
            className="uppercase"
          />
        </form>
      </Modal>
    </div >
  );
};

export default Secoes;
