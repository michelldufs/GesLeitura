import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalidade } from '../../contexts/LocalidadeContext';
import { Route as RouteIcon, Plus, Edit2, Trash2, Ban } from 'lucide-react';
import { GlassCard, ButtonPrimary, ButtonSecondary, InputField, SelectField, AlertBox, Modal, PageHeader, Badge } from '../../components/MacOSDesign';
import { gerarProximoCodigoRota, validarCodigoRota } from '../../services/codigoValidator';

interface Rota {
  id: string;
  codigo?: string;
  nome: string;
  secaoId: string;
  localidadeId: string;
  active: boolean;
}

interface Secao {
  id: string;
  codigo?: string;
  nome: string;
  localidadeId: string;
}

interface Localidade {
  id: string;
  codigo?: string;
  nome: string;
}

const Rotas: React.FC = () => {
  const { userProfile } = useAuth();
  const { selectedLocalidade } = useLocalidade();
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [secoes, setSecoes] = useState<Secao[]>([]);
  const [localidades, setLocalidades] = useState<Localidade[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [codigoValidacao, setCodigoValidacao] = useState<{ valido: boolean; erro?: string }>({ valido: true });

  const [formData, setFormData] = useState({
    nome: '',
    localidadeId: '',
    secaoId: ''
  });

  useEffect(() => {
    loadData();
  }, [selectedLocalidade]);

  const gerarCodigoRota = (): string => {
    if (!formData.secaoId || !formData.localidadeId) return '';

    const secao = secoes.find(s => s.id === formData.secaoId);
    const localidade = localidades.find(l => l.id === formData.localidadeId);

    if (!secao || !localidade) return '';
    if (!secao.codigo || !localidade.codigo) return '';

    // Filtrar rotas da mesma seção para gerar sequência correta
    const rotasDaSecao = rotas.filter(r => r.secaoId === formData.secaoId);
    return gerarProximoCodigoRota(localidade.codigo, secao.codigo, rotasDaSecao);
  };

  const loadData = async () => {
    try {
      const locQuery = query(collection(db, 'localidades'), where('active', '==', true));
      const locSnapshot = await getDocs(locQuery);
      setLocalidades(locSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Localidade)));

      // Carregar seções da localidade selecionada
      if (!selectedLocalidade) {
        setSecoes([]);
        setRotas([]);
        return;
      }

      const secQuery = query(
        collection(db, 'secoes'),
        where('active', '==', true),
        where('localidadeId', '==', selectedLocalidade)
      );

      const secSnapshot = await getDocs(secQuery);
      const secoesData = secSnapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          codigo: data.codigo,
          nome: data.nome,
          localidadeId: data.localidadeId
        } as Secao;
      });
      setSecoes(secoesData);

      // Carregar rotas da localidade selecionada (ativos e inativos)
      const rotQuery = query(
        collection(db, 'rotas'),
        where('localidadeId', '==', selectedLocalidade)
      );

      const rotSnapshot = await getDocs(rotQuery);
      const rotasData = rotSnapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          codigo: data.codigo,
          nome: data.nome,
          secaoId: data.secaoId,
          localidadeId: data.localidadeId,
          active: data.active
        } as Rota;
      });
      // Ordenar por código crescente
      rotasData.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
      setRotas(rotasData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const handleOpenModal = () => {
    setFormData({ nome: '', localidadeId: selectedLocalidade || '', secaoId: '' });
    setEditingId(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ nome: '', localidadeId: '', secaoId: '' });
    setEditingId(null);
    setCodigoValidacao({ valido: true });
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
          nome: formData.nome.toUpperCase(),
          secaoId: formData.secaoId,
          localidadeId: formData.localidadeId
        });
        setMessageType('success');
        setMessage('Rota atualizada com sucesso!');
      } else {
        const codigoGerado = gerarCodigoRota();

        // Validar se o código não é duplicado
        const validacao = validarCodigoRota(codigoGerado, rotas);
        if (!validacao.valido) {
          setMessageType('error');
          setMessage(validacao.erro || 'Código inválido');
          setLoading(false);
          return;
        }

        await addDoc(collection(db, 'rotas'), {
          codigo: codigoGerado,
          nome: formData.nome.toUpperCase(),
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

  const handleToggleStatus = async (rota: Rota) => {
    const novoStatus = !rota.active;
    const acao = novoStatus ? 'ativar' : 'desativar';
    if (!confirm(`Deseja realmente ${acao} esta rota?`)) return;

    try {
      await updateDoc(doc(db, 'rotas', rota.id), { active: novoStatus });
      setMessageType('success');
      setMessage(`Rota ${novoStatus ? 'ativada' : 'desativada'} com sucesso!`);
      loadData();
    } catch (error: any) {
      console.error(`Erro ao ${acao}:`, error);
      setMessageType('error');
      setMessage(error?.message || `Erro ao ${acao} rota`);
    }
  };

  const isAuthorized = userProfile && ['admin', 'gerente'].includes(userProfile.role);
  const filteredSecoes = secoes.filter(s => s.localidadeId === formData.localidadeId);
  const getLocalidadeNome = (id: string) => localidades.find(l => l.id === id)?.nome || 'N/A';
  const getSecaoNome = (id: string) => secoes.find(s => s.id === id)?.nome || 'N/A';

  return (
    <div className="w-full">
      <PageHeader
        title="Gestão de Rotas"
        subtitle="Crie e gerencie todas as rotas do sistema"
        action={
          <ButtonPrimary
            onClick={handleOpenModal}
            disabled={!isAuthorized}
            className="flex items-center gap-2"
          >
            <Plus size={20} /> Nova Rota
          </ButtonPrimary>
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

      {/* Tabela de Rotas */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-sm font-semibold text-gray-700">Rotas Cadastradas</h2>
          <span className="text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200 shadow-sm">
            {rotas.length} registros
          </span>
        </div>

        {rotas.length === 0 ? (
          <div className="text-center py-12">
            <RouteIcon className="mx-auto text-gray-300 mb-4" size={32} />
            <p className="text-gray-500 text-sm">Nenhuma rota cadastrada ainda.</p>
            <p className="text-gray-400 text-xs mt-2">Clique em "Nova Rota" para criar a primeira.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide">Código</th>
                  <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide">Nome</th>
                  <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide">Localidade</th>
                  <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide">Seção</th>
                  <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide text-center">Status</th>
                  <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rotas.map((rota) => (
                  <tr key={rota.id} className={`hover:bg-gray-50 transition-colors ${!rota.active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-2 font-medium text-gray-700 text-xs">{rota.codigo || '-'}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <RouteIcon className="text-green-500" size={14} />
                        <span className="font-medium text-gray-800 text-xs">{rota.nome}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {getLocalidadeNome(rota.localidadeId)}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                        {getSecaoNome(rota.secaoId)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => handleToggleStatus(rota)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${rota.active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100'
                          }`}
                        title={rota.active ? 'Desativar' : 'Ativar'}
                      >
                        {rota.active ? 'ATIVO' : 'INATIVO'}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => handleEdit(rota)}
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

      {/* Modal */}
      < Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingId ? 'Editar Rota' : 'Nova Rota'}
        actions={
          < div className="flex gap-3" >
            <ButtonPrimary onClick={handleSubmit} disabled={loading} type="submit">
              {loading ? 'Salvando...' : 'Salvar'}
            </ButtonPrimary>
            <ButtonSecondary onClick={handleCloseModal}>
              Cancelar
            </ButtonSecondary>
          </div >
        }
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <SelectField
            label="Localidade"
            value={formData.localidadeId}
            onChange={(e) => setFormData({ ...formData, localidadeId: e.target.value, secaoId: '' })}
            disabled={true}
            required
            options={[
              { value: '', label: 'Selecione a localidade' },
              ...localidades.map(loc => ({ value: loc.id, label: loc.nome }))
            ]}
          />

          <SelectField
            label="Seção"
            value={formData.secaoId}
            onChange={(e) => setFormData({ ...formData, secaoId: e.target.value })}
            disabled={!isAuthorized || !formData.localidadeId}
            required
            options={[
              { value: '', label: 'Selecione a seção' },
              ...filteredSecoes.map(sec => ({ value: sec.id, label: sec.nome }))
            ]}
          />

          {formData.secaoId && formData.localidadeId && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-900">
                <span className="font-semibold">Código que será gerado:</span> {gerarCodigoRota()}
              </p>
              <p className="text-xs text-green-800 mt-1">
                📋 Este código é gerado automaticamente e nunca será duplicado.
              </p>
            </div>
          )}

          <InputField
            label="Nome da Rota"
            placeholder="Ex: ROTA 01"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value.toUpperCase() })}
            disabled={!isAuthorized}
            required
          />
        </form>
      </Modal >
    </div >
  );
};

export default Rotas;
