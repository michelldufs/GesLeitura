import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalidade } from '../../contexts/LocalidadeContext';
import { DespesaGeral } from '../../types';
import { GlassCard, ButtonPrimary, ButtonSecondary, InputField, AlertBox, Modal, PageHeader } from '../../components/MacOSDesign';
import { Plus, Edit2, Trash2, DollarSign } from 'lucide-react';

const Despesas: React.FC = () => {
  const { userProfile } = useAuth();
  const { selectedLocalidade } = useLocalidade();
  const [despesas, setDespesas] = useState<DespesaGeral[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    valor: 0,
    descricao: '',
    tipo: 'operacional' as const
  });

  useEffect(() => {
    loadData();
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

  const handleOpenModal = () => {
    setFormData({
      data: new Date().toISOString().split('T')[0],
      valor: 0,
      descricao: '',
      tipo: 'operacional'
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
      tipo: 'operacional'
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.descricao.trim() || formData.valor <= 0 || !selectedLocalidade) return;

    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      if (editingId) {
        await updateDoc(doc(db, 'despesasGerais', editingId), {
          data: formData.data,
          valor: formData.valor,
          descricao: formData.descricao.toUpperCase(),
          tipo: formData.tipo
        });
        setMessageType('success');
        setMessage('Despesa atualizada com sucesso!');
      } else {
        await addDoc(collection(db, 'despesasGerais'), {
          data: formData.data,
          valor: formData.valor,
          descricao: formData.descricao.toUpperCase(),
          tipo: formData.tipo,
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

  const handleEdit = (despesa: DespesaGeral) => {
    setFormData({
      data: despesa.data,
      valor: despesa.valor,
      descricao: despesa.descricao,
      tipo: despesa.tipo
    });
    setEditingId(despesa.id || null);
    setShowModal(true);
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

  const isAuthorized = userProfile && ['admin', 'financeiro'].includes(userProfile.role);
  
  const totalDespesas = despesas.reduce((sum, d) => sum + d.valor, 0);
  const despesasOperacionais = despesas.filter(d => d.tipo === 'operacional').reduce((sum, d) => sum + d.valor, 0);
  const despesasAdiantamento = despesas.filter(d => d.tipo === 'adiantamento').reduce((sum, d) => sum + d.valor, 0);

  const formatTipo = (tipo: string) => {
    return tipo === 'operacional' ? '🏭 Operacional' : '💰 Adiantamento';
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader 
        title="Gestão de Despesas"
        subtitle="Registre e acompanhe despesas da localidade"
        action={
          <button
            onClick={handleOpenModal}
            disabled={!isAuthorized}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 disabled:opacity-60"
          >
            <Plus size={20} /> Nova Despesa
          </button>
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
    </div>
  );
};

export default Despesas;
