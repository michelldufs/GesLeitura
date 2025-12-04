import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalidade } from '../../contexts/LocalidadeContext';
import { Layers, Plus, Edit2, Trash2 } from 'lucide-react';
import { GlassCard, ButtonPrimary, ButtonSecondary, InputField, SelectField, AlertBox, Modal, PageHeader } from '../../components/MacOSDesign';

interface Secao {
  id: string;
  codigo?: string;
  nome: string;
  localidadeId: string;
  active: boolean;
}

interface Localidade {
  id: string;
  codigo?: string;
  nome: string;
}

const Secoes: React.FC = () => {
  const { userProfile } = useAuth();
  const { selectedLocalidade } = useLocalidade();
  const [secoes, setSecoes] = useState<Secao[]>([]);
  const [localidades, setLocalidades] = useState<Localidade[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [filterLocalidadeId, setFilterLocalidadeId] = useState('');

  const [formData, setFormData] = useState({
    nome: '',
    localidadeId: ''
  });

  useEffect(() => {
    loadData();
  }, [selectedLocalidade]);

  const loadData = async () => {
    try {
      console.log('Carregando dados de seções...');
      // Carregar localidades permitidas do usuário
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
      console.log('Localidades carregadas:', locData);
      setLocalidades(locData);

      // Todos os usuários (inclusive admin) veem apenas dados da localidade logada
      if (!selectedLocalidade) {
        setSecoes([]);
        return;
      }

      const secQuery = query(
        collection(db, 'secoes'),
        where('active', '==', true),
        where('localidadeId', '==', selectedLocalidade)
      );

      const secSnapshot = await getDocs(secQuery);
      console.log('Documentos de seções encontrados:', secSnapshot.size);
      const secData = secSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          codigo: data.codigo || '',
          nome: data.nome || '',
          localidadeId: data.localidadeId || '',
          active: data.active !== false
        } as Secao;
      });
      // Ordenar por código crescente
      secData.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
      console.log('Seções carregadas:', secData);
      setSecoes(secData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setSecoes([]);
      setLocalidades([]);
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
        await updateDoc(doc(db, 'secoes', editingId), { nome: formData.nome.toUpperCase(), localidadeId: formData.localidadeId });
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
        
        await addDoc(collection(db, 'secoes'), secaoData);
        setMessageType('success');
        setMessage('Seção criada com sucesso!');
      }
      handleCloseModal();
      loadData();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      setMessageType('error');
      setMessage(error?.message || 'Erro ao salvar seção');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (secao: Secao) => {
    setFormData({ nome: secao.nome, localidadeId: secao.localidadeId });
    setEditingId(secao.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente desativar esta seção?')) return;

    try {
      await updateDoc(doc(db, 'secoes', id), { active: false });
      setMessageType('success');
      setMessage('Seção desativada com sucesso!');
      loadData();
    } catch (error: any) {
      console.error('Erro ao desativar:', error);
      setMessageType('error');
      setMessage(error?.message || 'Erro ao desativar seção');
    }
  };

  const isAuthorized = userProfile && ['admin', 'gerente'].includes(userProfile.role);
  const getLocalidadeNome = (id: string) => localidades.find(l => l.id === id)?.nome || 'N/A';

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader 
        title="Gestão de Seções"
        subtitle="Crie e gerencie todas as seções do sistema"
        action={
          <button
            onClick={handleOpenModal}
            disabled={!isAuthorized}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 disabled:opacity-60"
          >
            <Plus size={20} /> Nova Seção
          </button>
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

      <GlassCard className="p-8">
        <h2 className="text-2xl font-semibold text-slate-900 mb-6">Seções Cadastradas</h2>

        {secoes.length === 0 ? (
          <div className="text-center py-12">
            <Layers className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 text-lg">Nenhuma seção cadastrada ainda.</p>
            <p className="text-slate-400 text-sm mt-2">Clique em "Nova Seção" para criar a primeira.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/50">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 border-b border-slate-200/50">
                <tr>
                  <th className="px-6 py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Código</th>
                  <th className="px-6 py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Nome</th>
                  <th className="px-6 py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Localidade</th>
                  <th className="px-6 py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {secoes.map((secao) => (
                  <tr key={secao.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-2.5 font-mono font-semibold text-slate-900">
                      {secao.codigo || <span className="text-slate-400 italic">sem código</span>}
                    </td>
                    <td className="px-6 py-2.5 font-medium text-slate-900 flex items-center gap-3">
                      <div className="p-2 bg-purple-100/50 rounded-lg">
                        <Layers className="text-purple-600" size={18} />
                      </div>
                      {secao.nome}
                    </td>
                    <td className="px-6 py-2.5 text-slate-600">{getLocalidadeNome(secao.localidadeId)}</td>
                    <td className="px-6 py-2.5 text-right flex justify-end gap-3">
                      <button
                        onClick={() => handleEdit(secao)}
                        disabled={!isAuthorized}
                        className="text-blue-500 hover:text-blue-700 font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <Edit2 size={16} /> Editar
                      </button>
                      <button
                        onClick={() => handleDelete(secao.id)}
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
        title={editingId ? 'Editar Seção' : 'Nova Seção'}
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
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Localidade</label>
            <select
              value={formData.localidadeId}
              onChange={(e) => setFormData({ ...formData, localidadeId: e.target.value })}
              disabled={true}
              required
              className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200/50 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:bg-slate-100"
            >
              <option value="">Selecione a localidade</option>
              {localidades && localidades.length > 0 && localidades.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.codigo ? `${loc.codigo} - ${loc.nome}` : loc.nome}
                </option>
              ))}
            </select>
          </div>

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
            required
            className="uppercase"
          />
        </form>
      </Modal>
    </div>
  );
};

export default Secoes;
