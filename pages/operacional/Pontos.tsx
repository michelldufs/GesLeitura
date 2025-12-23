import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalidade } from '../../contexts/LocalidadeContext';
import { useOperacional } from '../../contexts/OperacionalContext';
import { MapPin, Plus, Edit2, Trash2, Ban, Users } from 'lucide-react';
import { GlassCard, ButtonPrimary, ButtonSecondary, InputField, SelectField, AlertBox, Modal, PageHeader, Badge } from '../../components/MacOSDesign';
import { gerarProximoCodigoPonto, validarCodigoPonto } from '../../services/codigoValidator';

import { Ponto, Rota, Secao, Localidade, Operador } from '../../types';

const Pontos: React.FC = () => {
  const { userProfile } = useAuth();
  const { selectedLocalidade, localidades } = useLocalidade();
  const { pontos, rotas, secoes, operadores, refreshData } = useOperacional();

  const [coletores, setColetores] = useState<Array<{ uid: string; name: string }>>([]);
  const [showModal, setShowModal] = useState(false);
  const [showColetoresModal, setShowColetoresModal] = useState(false);
  const [pontoSelecionado, setPontoSelecionado] = useState<Ponto | null>(null);
  const [pontoExpandido, setPontoExpandido] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const [formData, setFormData] = useState({
    nome: '',
    rotaId: '',
    comissao: 0,
    participaDespesa: true,
    endereco: '',
    telefone: ''
  });

  const [filterRotaId, setFilterRotaId] = useState('');

  useEffect(() => {
    loadColetores();
  }, [selectedLocalidade]);

  const loadColetores = async () => {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'coleta'),
        where('active', '==', true)
      );
      const snapshot = await getDocs(usersQuery);
      const coletoresData = snapshot.docs.map(doc => ({
        uid: doc.id,
        name: doc.data().name || doc.data().email
      }));
      setColetores(coletoresData);
    } catch (error) {
      console.error('Erro ao carregar coletores:', error);
    }
  };

  const gerarCodigoPonto = (): string => {
    if (!formData.rotaId) return '';

    const rota = rotas.find(r => r.id === formData.rotaId);
    if (!rota) return '';

    // Filtrar pontos da mesma rota para gerar sequência correta
    const pontosRota = pontos.filter(p => p.rotaId === formData.rotaId);
    return gerarProximoCodigoPonto(rota.codigo || '00', pontosRota);
  };

  const handleOpenModal = () => {
    setFormData({ nome: '', rotaId: '', comissao: 0, participaDespesa: true, endereco: '', telefone: '' });
    setEditingId(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ nome: '', rotaId: '', comissao: 0, participaDespesa: true, endereco: '', telefone: '' });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim() || !formData.rotaId) return;

    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      const codigo = gerarCodigoPonto();

      if (editingId) {
        await updateDoc(doc(db, 'pontos', editingId), {
          nome: formData.nome.toUpperCase(),
          rotaId: formData.rotaId,
          comissao: formData.comissao,
          participaDespesa: formData.participaDespesa,
          endereco: formData.endereco.toUpperCase(),
          telefone: formData.telefone
        });
        setMessageType('success');
        setMessage('Ponto atualizado com sucesso!');
      } else {
        const rota = rotas.find(r => r.id === formData.rotaId);
        if (!rota) throw new Error('Rota não encontrada');

        // Validar se o código não é duplicado
        const validacao = validarCodigoPonto(codigo, pontos);
        if (!validacao.valido) {
          setMessageType('error');
          setMessage(validacao.erro || 'Código inválido');
          setLoading(false);
          return;
        }

        await addDoc(collection(db, 'pontos'), {
          codigo,
          nome: formData.nome.toUpperCase(),
          rotaId: formData.rotaId,
          localidadeId: rota.localidadeId,
          comissao: formData.comissao,
          participaDespesa: formData.participaDespesa,
          endereco: (formData.endereco || '').toUpperCase(),
          telefone: formData.telefone || '',
          qtdEquipamentos: 0,
          active: true
        });
        setMessageType('success');
        setMessage('Ponto criado com sucesso!');
      }
      handleCloseModal();
      refreshData();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      setMessageType('error');
      setMessage(error?.message || 'Erro ao salvar ponto');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (ponto: Ponto) => {
    setFormData({
      nome: ponto.nome,
      rotaId: ponto.rotaId,
      comissao: ponto.comissao || 0,
      participaDespesa: ponto.participaDespesa ?? true,
      endereco: ponto.endereco || '',
      telefone: ponto.telefone || ''
    });
    setEditingId(ponto.id);
    setShowModal(true);
  };

  const handleToggleStatus = async (ponto: Ponto) => {
    const novoStatus = !ponto.active;
    const acao = novoStatus ? 'ativar' : 'desativar';
    if (!confirm(`Deseja realmente ${acao} este ponto?`)) return;

    try {
      await updateDoc(doc(db, 'pontos', ponto.id), { active: novoStatus });
      setMessageType('success');
      setMessage(`Ponto ${novoStatus ? 'ativado' : 'desativado'} com sucesso!`);
      refreshData();
    } catch (error: any) {
      console.error(`Erro ao ${acao}:`, error);
      setMessageType('error');
      setMessage(error?.message || `Erro ao ${acao} ponto`);
    }
  };

  const handleGerenciarColetores = (ponto: Ponto) => {
    setPontoSelecionado(ponto);
    setShowColetoresModal(true);
  };

  const handleToggleColetor = async (coletorUid: string) => {
    if (!pontoSelecionado) return;

    try {
      const coletoresAtuais = pontoSelecionado.coletoresVinculados || [];
      const novaLista = coletoresAtuais.includes(coletorUid)
        ? coletoresAtuais.filter(uid => uid !== coletorUid)
        : [...coletoresAtuais, coletorUid];

      await updateDoc(doc(db, 'pontos', pontoSelecionado.id), {
        coletoresVinculados: novaLista
      });

      setPontoSelecionado({ ...pontoSelecionado, coletoresVinculados: novaLista });
      refreshData();
    } catch (error: any) {
      setMessageType('error');
      setMessage(error?.message || 'Erro ao atualizar coletores');
    }
  };

  const isAuthorized = userProfile && ['admin', 'gerente'].includes(userProfile.role);
  const getRotaNome = (id: string) => rotas.find(r => r.id === id)?.nome || 'N/A';
  const getRotaCodigo = (id: string) => rotas.find(r => r.id === id)?.codigo || '';
  const getOperadoresPorPonto = (pontoId: string) => operadores.filter(op => op.pontoId === pontoId);
  const getRotaColor = (rotaId: string) => {
    const index = rotas.findIndex(r => r.id === rotaId);
    const colors = ['bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-orange-100 text-orange-700', 'bg-pink-100 text-pink-700', 'bg-indigo-100 text-indigo-700'];
    return colors[index % colors.length] || 'bg-slate-100 text-slate-700';
  };

  const rotasFiltradas = filterRotaId
    ? rotas.filter(r => r.id === filterRotaId)
    : rotas;

  return (
    <div className="w-full">
      <PageHeader
        title="Gestão de Pontos"
        subtitle="Crie e gerencie todos os pontos de venda do sistema"
        action={
          <ButtonPrimary
            onClick={handleOpenModal}
            disabled={!isAuthorized}
            className="flex items-center gap-2"
          >
            <Plus size={20} /> Novo Ponto
          </ButtonPrimary>
        }
      />

      {!isAuthorized && (
        <AlertBox
          type="warning"
          message={`Seu perfil (${userProfile?.role}) não possui permissão para gerenciar pontos.`}
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

      {/* Tabela de Pontos */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-sm font-semibold text-gray-700">Pontos Cadastrados</h2>
          <span className="text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200 shadow-sm">
            {pontos.length} registros
          </span>
        </div>

        {pontos.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="mx-auto text-gray-300 mb-4" size={32} />
            <p className="text-gray-500 text-sm">Nenhum ponto cadastrado ainda.</p>
            <p className="text-gray-400 text-xs mt-2">Clique em "Novo Ponto" para criar o primeiro.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide">Código</th>
                  <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide">Nome</th>
                  <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide">Rota</th>
                  <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide">Comissão</th>
                  <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide">Equipamentos</th>
                  <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide">Coletores</th>
                  <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide text-center">Status</th>
                  <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pontos.map((ponto) => {
                  const operadoresDoPonto = getOperadoresPorPonto(ponto.id);
                  const isExpanded = pontoExpandido === ponto.id;
                  return (
                    <React.Fragment key={ponto.id}>
                      <tr className={`hover:bg-gray-50 transition-colors ${!ponto.active ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-2 font-medium text-gray-700 text-xs">{ponto.codigo}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800 text-xs">{ponto.nome}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getRotaColor(ponto.rotaId).replace('bg-', 'bg-opacity-20 border-').replace('text-', 'text-')}`}>
                            {getRotaNome(ponto.rotaId)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-600 text-xs font-medium">{ponto.comissao}%</td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => setPontoExpandido(isExpanded ? null : ponto.id)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-all border ${operadoresDoPonto.length > 0
                              ? 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100'
                              : 'bg-gray-50 text-gray-400 border-gray-100'
                              }`}
                            disabled={operadoresDoPonto.length === 0}
                          >
                            <span className="font-bold">{operadoresDoPonto.length}</span>
                            <span>{operadoresDoPonto.length === 1 ? 'operador' : 'operadores'}</span>
                            {operadoresDoPonto.length > 0 && (
                              <svg
                                className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => handleGerenciarColetores(ponto)}
                            className="flex items-center gap-1.5 px-2 py-1 text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-100 transition-colors"
                            title="Gerenciar coletores"
                          >
                            <Users size={12} />
                            <span className="font-bold">{(ponto.coletoresVinculados || []).length}</span>
                          </button>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => handleToggleStatus(ponto)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${ponto.active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100'
                              }`}
                            title={ponto.active ? 'Desativar' : 'Ativar'}
                          >
                            {ponto.active ? 'ATIVO' : 'INATIVO'}
                          </button>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => handleEdit(ponto)}
                            className="p-1 text-gray-400 hover:text-emerald-600 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </button>
                        </td>
                      </tr>

                      {/* Linha expansível com lista de operadores */}
                      {isExpanded && operadoresDoPonto.length > 0 && (
                        <tr className="bg-gray-50/50">
                          <td colSpan={8} className="px-4 py-3 border-t border-b border-gray-100 shadow-inner">
                            <div className="text-xs">
                              <p className="font-semibold text-gray-500 mb-2 uppercase tracking-wide">Operadores vinculados:</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                {operadoresDoPonto.map(op => (
                                  <div key={op.id} className="flex items-center gap-2 bg-white px-2 py-1.5 rounded border border-gray-200 shadow-sm">
                                    <span className="font-mono font-bold text-gray-700 bg-gray-100 px-1 rounded">{op.codigo}</span>
                                    <span className="text-gray-600 truncate">{op.nome}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      < Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingId ? 'Editar Ponto' : 'Novo Ponto'}
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
            label="Rota"
            value={formData.rotaId}
            onChange={(e) => setFormData({ ...formData, rotaId: e.target.value })}
            options={[
              { value: '', label: 'Selecione a rota' },
              ...rotas.map(rota => ({ value: rota.id, label: rota.nome }))
            ]}
            disabled={!isAuthorized}
            required
          />

          {formData.rotaId && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Código gerado:</span> {gerarCodigoPonto()}
              </p>
            </div>
          )}

          <InputField
            label="Nome do Ponto"
            placeholder="Ex: SENADOR CANEDO"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value.toUpperCase() })}
            disabled={!isAuthorized}
            required
          />

          <InputField
            label="Comissão (%)"
            type="number"
            placeholder="Ex: 5"
            value={formData.comissao}
            onChange={(e) => setFormData({ ...formData, comissao: parseFloat(e.target.value) || 0 })}
            disabled={!isAuthorized}
            min="0"
            max="100"
            step="0.1"
          />

          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.participaDespesa}
                onChange={(e) => setFormData({ ...formData, participaDespesa: e.target.checked })}
                disabled={!isAuthorized}
                className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div>
                <span className="text-sm font-semibold text-slate-700">Participa da Despesa</span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quando marcado, a despesa é descontada antes da comissão
                </p>
              </div>
            </label>
          </div>

          <InputField
            label="Endereço (opcional)"
            placeholder="Ex: RUA X, 123"
            value={formData.endereco}
            onChange={(e) => setFormData({ ...formData, endereco: e.target.value.toUpperCase() })}
            disabled={!isAuthorized}
          />

          <InputField
            label="Telefone (opcional)"
            placeholder="Ex: (62) 1234-5678"
            value={formData.telefone}
            onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
            disabled={!isAuthorized}
          />
        </form>
      </Modal >

      {/* Modal de Gerenciamento de Coletores */}
      <Modal
        isOpen={showColetoresModal}
        onClose={() => setShowColetoresModal(false)}
        title={`Coletores - ${pontoSelecionado?.nome || ''}`}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600 mb-4">
            Selecione os coletores autorizados a registrar leituras neste ponto:
          </p>
          {coletores.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto text-gray-300 mb-2" size={32} />
              <p className="text-gray-500 text-sm">Nenhum coletor cadastrado no sistema.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {coletores.map((coletor) => {
                const isVinculado = (pontoSelecionado?.coletoresVinculados || []).includes(coletor.uid);
                return (
                  <label
                    key={coletor.uid}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${isVinculado
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={isVinculado}
                      onChange={() => handleToggleColetor(coletor.uid)}
                      className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{coletor.name}</p>
                      <p className="text-xs text-gray-500">{coletor.uid.substring(0, 8)}...</p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </div >
  );
};

export default Pontos;
