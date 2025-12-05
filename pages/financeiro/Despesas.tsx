import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalidade } from '../../contexts/LocalidadeContext';
import { DespesaGeral, CentroCusto } from '../../types';
import { GlassCard, ButtonPrimary, ButtonSecondary, InputField, AlertBox, Modal, PageHeader } from '../../components/MacOSDesign';
import { Plus, Edit2, Trash2, DollarSign, FolderTree } from 'lucide-react';

const Despesas: React.FC = () => {
  const { userProfile } = useAuth();
  const { selectedLocalidade } = useLocalidade();
  const [despesas, setDespesas] = useState<DespesaGeral[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showCCModal, setShowCCModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCCId, setEditingCCId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const [formData, setFormData] = useState<{
    data: string;
    valor: number;
    descricao: string;
    tipo: 'operacional' | 'adiantamento';
    centroCustoId: string;
  }>({
    data: new Date().toISOString().split('T')[0],
    valor: 0,
    descricao: '',
    tipo: 'operacional',
    centroCustoId: ''
  });

  const [ccFormData, setCCFormData] = useState({
    nome: '',
    descricao: ''
  });

  useEffect(() => {
    loadData();
    loadCentrosCusto();
  }, [selectedLocalidade]);

  const loadData = async () => {
    if (!selectedLocalidade) {
      setDespesas([]);
      return;
    }

    try {
      const despesasQuery = query(
        collection(db, 'despesasGerais'),
        where('active', '==', true),
        where('localidadeId', '==', selectedLocalidade)
      );

      const snapshot = await getDocs(despesasQuery);
      const despesasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DespesaGeral));
      
      // Ordenar por data decrescente
      despesasData.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      setDespesas(despesasData);
    } catch (error) {
      console.error('Erro ao carregar despesas:', error);
    }
  };

  const loadCentrosCusto = async () => {
    if (!selectedLocalidade) {
      setCentrosCusto([]);
      return;
    }

    try {
      const ccQuery = query(
        collection(db, 'centrosCusto'),
        where('active', '==', true),
        where('localidadeId', '==', selectedLocalidade)
      );

      const snapshot = await getDocs(ccQuery);
      const ccData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CentroCusto));
      
      // Ordenar por nome crescente
      ccData.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
      setCentrosCusto(ccData);
    } catch (error) {
      console.error('Erro ao carregar centros de custo:', error);
    }
  };

  const handleOpenModal = () => {
    setFormData({
      data: new Date().toISOString().split('T')[0],
      valor: 0,
      descricao: '',
      tipo: 'operacional',
      centroCustoId: ''
    });
    setEditingId(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      data: new Date().toISOString().split('T')[0],
      valor: 0,
      descricao: '',
      tipo: 'operacional',
      centroCustoId: ''
    });
    setEditingId(null);
  };

  const handleOpenCCModal = () => {
    setCCFormData({ nome: '', descricao: '' });
    setEditingCCId(null);
    setShowCCModal(true);
  };

  const handleCloseCCModal = () => {
    setShowCCModal(false);
    setCCFormData({ nome: '', descricao: '' });
    setEditingCCId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valorNumerico = parseFloat(formData.valor as any) || 0;
    if (!formData.descricao.trim() || valorNumerico <= 0 || !selectedLocalidade) return;

    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      if (editingId) {
        await updateDoc(doc(db, 'despesasGerais', editingId), {
          data: formData.data,
          valor: valorNumerico,
          descricao: formData.descricao.toUpperCase(),
          tipo: formData.tipo,
          centroCustoId: formData.centroCustoId || null
        });
        setMessageType('success');
        setMessage('Despesa atualizada com sucesso!');
      } else {
        await addDoc(collection(db, 'despesasGerais'), {
          data: formData.data,
          valor: valorNumerico,
          descricao: formData.descricao.toUpperCase(),
          tipo: formData.tipo,
          centroCustoId: formData.centroCustoId || null,
          userId: userProfile?.uid,
          localidadeId: selectedLocalidade,
          active: true
        });
        setMessageType('success');
        setMessage('Despesa criada com sucesso!');
      }
      handleCloseModal();
      loadData();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      setMessageType('error');
      setMessage(error?.message || 'Erro ao salvar despesa');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ccFormData.nome.trim() || !selectedLocalidade) return;

    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      if (editingCCId) {
        await updateDoc(doc(db, 'centrosCusto', editingCCId), {
          nome: ccFormData.nome.toUpperCase(),
          descricao: ccFormData.descricao.toUpperCase()
        });
        setMessageType('success');
        setMessage('Centro de custo atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'centrosCusto'), {
          nome: ccFormData.nome.toUpperCase(),
          descricao: ccFormData.descricao.toUpperCase(),
          localidadeId: selectedLocalidade,
          active: true
        });
        setMessageType('success');
        setMessage('Centro de custo criado com sucesso!');
      }
      handleCloseCCModal();
      loadCentrosCusto();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      setMessageType('error');
      setMessage(error?.message || 'Erro ao salvar centro de custo');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (despesa: DespesaGeral) => {
    setFormData({
      data: despesa.data,
      valor: despesa.valor,
      descricao: despesa.descricao,
      tipo: despesa.tipo,
      centroCustoId: despesa.centroCustoId || ''
    });
    setEditingId(despesa.id || null);
    setShowModal(true);
  };

  const handleEditCC = (cc: CentroCusto) => {
    setCCFormData({
      nome: cc.nome,
      descricao: cc.descricao || ''
    });
    setEditingCCId(cc.id || null);
    setShowCCModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente desativar esta despesa?')) return;

    try {
      await updateDoc(doc(db, 'despesasGerais', id), { active: false });
      setMessageType('success');
      setMessage('Despesa desativada com sucesso!');
      loadData();
    } catch (error: any) {
      console.error('Erro ao desativar:', error);
      setMessageType('error');
      setMessage(error?.message || 'Erro ao desativar despesa');
    }
  };

  const handleDeleteCC = async (id: string) => {
    if (!confirm('Deseja realmente desativar este centro de custo?')) return;

    try {
      await updateDoc(doc(db, 'centrosCusto', id), { active: false });
      setMessageType('success');
      setMessage('Centro de custo desativado com sucesso!');
      loadCentrosCusto();
    } catch (error: any) {
      console.error('Erro ao desativar:', error);
      setMessageType('error');
      setMessage(error?.message || 'Erro ao desativar centro de custo');
    }
  };

  const isAuthorized = userProfile && ['admin', 'gerente', 'financeiro'].includes(userProfile.role);
  
  const totalDespesas = despesas.reduce((sum, d) => sum + d.valor, 0);
  const despesasOperacionais = despesas.filter(d => d.tipo === 'operacional').reduce((sum, d) => sum + d.valor, 0);
  const despesasAdiantamento = despesas.filter(d => d.tipo === 'adiantamento').reduce((sum, d) => sum + d.valor, 0);

  const formatTipo = (tipo: string) => {
    return tipo === 'operacional' ? '🏭 Operacional' : '💰 Adiantamento';
  };

  const getCentroCustoNome = (centroCustoId?: string) => {
    if (!centroCustoId) return '-';
    const cc = centrosCusto.find(c => c.id === centroCustoId);
    return cc ? cc.nome : '-';
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader 
        title="Gestão de Despesas"
        subtitle="Registre e acompanhe despesas da localidade"
        action={
          <div className="flex gap-3">
            <button
              onClick={handleOpenCCModal}
              disabled={!isAuthorized}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 disabled:opacity-60"
            >
              <FolderTree size={20} /> Centro de Custos
            </button>
            <button
              onClick={handleOpenModal}
              disabled={!isAuthorized}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 disabled:opacity-60"
            >
              <Plus size={20} /> Nova Despesa
            </button>
          </div>
        }
      />

      {!isAuthorized && (
        <AlertBox 
          type="warning"
          message={`Seu perfil (${userProfile?.role}) não possui permissão para gerenciar despesas.`}
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

      {/* Resumo de Despesas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Geral */}
        <GlassCard className="p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-semibold mb-1">Total de Despesas</p>
              <p className="text-3xl font-bold text-red-600">R$ {totalDespesas.toFixed(2)}</p>
            </div>
            <DollarSign className="text-red-400" size={40} />
          </div>
        </GlassCard>

        {/* Despesas Operacionais */}
        <GlassCard className="p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-semibold mb-1">Operacionais</p>
              <p className="text-3xl font-bold text-orange-600">R$ {despesasOperacionais.toFixed(2)}</p>
            </div>
            <div className="text-4xl">🏭</div>
          </div>
        </GlassCard>

        {/* Adiantamentos */}
        <GlassCard className="p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-semibold mb-1">Adiantamentos</p>
              <p className="text-3xl font-bold text-yellow-600">R$ {despesasAdiantamento.toFixed(2)}</p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </GlassCard>
      </div>

      {/* Tabela de Despesas */}
      <GlassCard className="p-8">
        <h2 className="text-2xl font-semibold text-slate-900 mb-6">Despesas Cadastradas</h2>

        {despesas.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 text-lg">Nenhuma despesa cadastrada ainda.</p>
            <p className="text-slate-400 text-sm mt-2">Clique em "Nova Despesa" para registrar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/50">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 border-b border-slate-200/50">
                <tr>
                  <th className="px-6 py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Data</th>
                  <th className="px-6 py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Descrição</th>
                  <th className="px-6 py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Centro de Custo</th>
                  <th className="px-6 py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Tipo</th>
                  <th className="px-6 py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide text-right">Valor</th>
                  <th className="px-6 py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {despesas.map((despesa) => (
                  <tr key={despesa.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-2.5 font-medium text-slate-900">
                      {new Date(despesa.data).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-2.5 text-slate-600 flex items-center gap-3">
                      <div className="p-2 bg-red-100/50 rounded-lg">
                        <DollarSign className="text-red-600" size={18} />
                      </div>
                      {despesa.descricao}
                    </td>
                    <td className="px-6 py-2.5 text-slate-600">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100/50 text-purple-700 rounded-md text-xs font-medium">
                        <FolderTree size={12} />
                        {getCentroCustoNome(despesa.centroCustoId)}
                      </span>
                    </td>
                    <td className="px-6 py-2.5 text-slate-600">{formatTipo(despesa.tipo)}</td>
                    <td className="px-6 py-2.5 text-right font-bold text-red-600">
                      R$ {despesa.valor.toFixed(2)}
                    </td>
                    <td className="px-6 py-2.5 text-right flex justify-end gap-3">
                      <button
                        onClick={() => handleEdit(despesa)}
                        disabled={!isAuthorized}
                        className="text-blue-500 hover:text-blue-700 font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <Edit2 size={16} /> Editar
                      </button>
                      <button
                        onClick={() => handleDelete(despesa.id || '')}
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
        title={editingId ? 'Editar Despesa' : 'Nova Despesa'}
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
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Data <span className="text-red-500">*</span>
            </label>
            <input 
              type="date" 
              value={formData.data}
              onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              disabled={!isAuthorized}
              required
              className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Descrição <span className="text-red-500">*</span>
            </label>
            <InputField
              placeholder="Ex: MATERIAL DE LIMPEZA"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value.toUpperCase() })}
              disabled={!isAuthorized}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Centro de Custo
            </label>
            <select
              value={formData.centroCustoId}
              onChange={(e) => setFormData({ ...formData, centroCustoId: e.target.value })}
              disabled={!isAuthorized}
              className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50"
            >
              <option value="">Nenhum</option>
              {centrosCusto.map(cc => (
                <option key={cc.id} value={cc.id}>{cc.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Valor (R$) <span className="text-red-500">*</span>
            </label>
            <input 
              type="number" 
              step="0.01"
              min="0"
              value={formData.valor}
              onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })}
              disabled={!isAuthorized}
              required
              placeholder="0.00"
              className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Tipo de Despesa <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'operacional' | 'adiantamento' })}
              disabled={!isAuthorized}
              required
              className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50"
            >
              <option value="operacional">🏭 Operacional</option>
              <option value="adiantamento">💰 Adiantamento</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Modal Centro de Custos */}
      <Modal 
        isOpen={showCCModal}
        onClose={handleCloseCCModal}
        title={editingCCId ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
        actions={
          <div className="flex gap-3">
            <ButtonPrimary onClick={handleSubmitCC} disabled={loading} type="submit">
              {loading ? 'Salvando...' : 'Salvar'}
            </ButtonPrimary>
            <ButtonSecondary onClick={handleCloseCCModal}>
              Cancelar
            </ButtonSecondary>
          </div>
        }
      >
        <form onSubmit={handleSubmitCC} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Nome <span className="text-red-500">*</span>
            </label>
            <InputField
              placeholder="Ex: ENERGIA ELÉTRICA"
              value={ccFormData.nome}
              onChange={(e) => setCCFormData({ ...ccFormData, nome: e.target.value.toUpperCase() })}
              disabled={!isAuthorized}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Descrição (Opcional)
            </label>
            <textarea
              placeholder="DESCRIÇÃO DETALHADA DO CENTRO DE CUSTO"
              value={ccFormData.descricao}
              onChange={(e) => setCCFormData({ ...ccFormData, descricao: e.target.value.toUpperCase() })}
              disabled={!isAuthorized}
              rows={3}
              className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 resize-none uppercase"
            />
          </div>

          {/* Lista de Centros de Custo Existentes */}
          {!editingCCId && centrosCusto.length > 0 && (
            <div className="border-t border-slate-200 pt-4 mt-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Centros de Custo Cadastrados</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {centrosCusto.map((cc) => (
                  <div key={cc.id} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-lg border border-slate-200/50">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{cc.nome}</p>
                      {cc.descricao && <p className="text-xs text-slate-500 mt-1">{cc.descricao}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditCC(cc)}
                        disabled={!isAuthorized}
                        className="text-blue-500 hover:text-blue-700 font-medium transition-colors flex items-center gap-1 disabled:opacity-50 text-sm"
                      >
                        <Edit2 size={14} /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCC(cc.id || '')}
                        disabled={!isAuthorized}
                        className="text-red-500 hover:text-red-700 font-medium transition-colors flex items-center gap-1 disabled:opacity-50 text-sm"
                      >
                        <Trash2 size={14} /> Desativar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
};

export default Despesas;
