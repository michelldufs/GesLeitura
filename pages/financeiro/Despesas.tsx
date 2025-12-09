import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalidade } from '../../contexts/LocalidadeContext';
import { db } from '../../services/firebaseConfig';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc
} from 'firebase/firestore';
import {
  GlassCard,
  AlertBox,
  PageHeader,
  ButtonPrimary,
  ButtonSecondary,
  InputField,
  SelectField,
  Badge,
  Modal
} from '../../components/MacOSDesign';
import {
  Plus,
  Edit2,
  Trash2,
  FolderTree,
  DollarSign,
  Ban,
  User,
  Info,
  Filter,
  Check,
  X
} from 'lucide-react';
import { DespesaGeral, CentroCusto, UserProfile } from '../../types.ts';

// Tipo unificado para exibição na tabela
interface UnifiedDespesa extends DespesaGeral {
  origem: 'manual' | 'leitura';
  vendaId?: string;
  userNameDisplay?: string;
}

// Filtros para as colunas
interface ColumnFilters {
  data: string[];
  origem: string[];
  centroCusto: string[];
  usuario: string[];
}

// Helper Header Filter Component - Moved outside to prevent re-creation
const HeaderWithFilter = ({
  label,
  filterKey,
  values,
  activeFilters,
  openFilter,
  setOpenFilter,
  toggleFilter,
  clearFilter,
  filterRef
}: {
  label: string,
  filterKey: keyof ColumnFilters,
  values: string[],
  activeFilters: ColumnFilters,
  openFilter: string | null,
  setOpenFilter: (key: string | null) => void,
  toggleFilter: (column: keyof ColumnFilters, value: string) => void,
  clearFilter: (column: keyof ColumnFilters) => void,
  filterRef: React.RefObject<HTMLDivElement>
}) => {
  const isOpen = openFilter === filterKey;
  const isActive = activeFilters[filterKey].length > 0;

  return (
    <div className="relative flex items-center gap-2">
      <span>{label}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpenFilter(isOpen ? null : filterKey);
        }}
        className={`p-1 rounded-md transition-colors ${isActive ? 'bg-emerald-100 text-emerald-600' : 'hover:bg-slate-200 text-gray-400'}`}
      >
        <Filter size={14} fill={isActive ? "currentColor" : "none"} />
      </button>

      {isOpen && (
        <div ref={filterRef} className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="p-2 border-b border-gray-100 bg-slate-50 flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-600 uppercase">Filtrar por {label}</span>
            {isActive && (
              <button
                onClick={() => clearFilter(filterKey)}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Limpar
              </button>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {values.length === 0 ? (
              <p className="p-3 text-xs text-gray-400 text-center">Nenhum valor encontrado</p>
            ) : (
              values.map(val => (
                <label key={val} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-md cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={activeFilters[filterKey].includes(val)}
                    onChange={() => toggleFilter(filterKey, val)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-600 truncate">{val}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Despesas: React.FC = () => {
  const { userProfile } = useAuth();
  const { selectedLocalidade } = useLocalidade();

  // States
  const [despesas, setDespesas] = useState<UnifiedDespesa[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});

  // Filter States
  const [activeFilters, setActiveFilters] = useState<ColumnFilters>({
    data: [],
    origem: [],
    centroCusto: [],
    usuario: []
  });
  const [openFilter, setOpenFilter] = useState<string | null>(null);

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

  // Helper functions - Moved here to prevent ReferenceError
  const getCentroCustoNome = (centroCustoId?: string) => {
    if (!centroCustoId) return '-';
    // Accessing centrosCusto from state closure
    const cc = centrosCusto.find(c => c.id === centroCustoId);
    return cc ? cc.nome : '-';
  };

  const formatTipo = (tipo: string) => {
    return tipo === 'operacional' ? '🏭 Operacional' : '💰 Adiantamento';
  };

  // Refs for click outside handling
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUsers();

    // Click outside listener
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setOpenFilter(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedLocalidade) {
      loadData();
      loadCentrosCusto();
    }
  }, [selectedLocalidade, usersMap]);

  const loadUsers = async () => {
    try {
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      const map: Record<string, string> = {};
      snapshot.forEach(doc => {
        const data = doc.data() as UserProfile;
        map[doc.id] = data.name || data.email || 'Desconhecido';
      });
      setUsersMap(map);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const loadData = async () => {
    if (!selectedLocalidade) {
      setDespesas([]);
      return;
    }

    try {
      const allDespesas: UnifiedDespesa[] = [];

      // 1. Buscar Despesas Gerais (Manuais)
      const despesasQuery = query(
        collection(db, 'despesasGerais'),
        where('active', '==', true),
        where('localidadeId', '==', selectedLocalidade)
      );
      const despesasSnapshot = await getDocs(despesasQuery);
      despesasSnapshot.forEach(doc => {
        const data = doc.data() as DespesaGeral;
        allDespesas.push({
          ...data,
          id: doc.id,
          origem: 'manual',
          userNameDisplay: data.userName || usersMap[data.userId] || 'Sistema'
        });
      });

      // 2. Buscar Despesas de Leituras (Vendas)
      const vendasQuery = query(
        collection(db, 'vendas'),
        where('active', '==', true),
        where('localidadeId', '==', selectedLocalidade)
      );
      const vendasSnapshot = await getDocs(vendasQuery);
      vendasSnapshot.forEach(doc => {
        const data = doc.data() as any;
        if (data.despesa && data.despesa > 0) {
          allDespesas.push({
            id: doc.id,
            data: data.data,
            valor: data.despesa,
            descricao: 'DESPESA DE MÁQUINA (LEITURA)',
            userId: data.userId,
            localidadeId: data.localidadeId,
            tipo: 'operacional',
            centroCustoId: data.centroCustoId,
            active: true,
            origem: 'leitura',
            vendaId: doc.id,
            userNameDisplay: usersMap[data.userId] || 'Leiturista'
          });
        }
      });

      allDespesas.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

      setDespesas(allDespesas);
    } catch (error) {
      console.error('Erro ao carregar despesas:', error);
      setMessage('Erro ao carregar dados. Verifique sua conexão.');
      setMessageType('error');
    }
  };

  const loadCentrosCusto = async () => {
    if (!selectedLocalidade) return;

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

      ccData.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
      setCentrosCusto(ccData);
    } catch (error) {
      console.error('Erro ao carregar centros de custo:', error);
    }
  };

  // --- FILTER LOGIC ---

  const getUniqueValues = (key: keyof UnifiedDespesa | 'centroCustoNome' | 'origemFormatada') => {
    const values = new Set<string>();
    despesas.forEach(d => {
      let value = '';
      if (key === 'centroCustoNome') {
        value = getCentroCustoNome(d.centroCustoId);
      } else if (key === 'origemFormatada') {
        value = d.origem === 'manual' ? 'Manual' : 'Leitura';
      } else if (key === 'data') {
        value = new Date(d.data).toLocaleDateString('pt-BR');
      } else {
        value = String(d[key as keyof UnifiedDespesa] || '');
      }
      if (value) values.add(value);
    });
    return Array.from(values).sort();
  };

  const toggleFilter = (column: keyof ColumnFilters, value: string) => {
    setActiveFilters(prev => {
      const current = prev[column];
      const newValues = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [column]: newValues };
    });
  };

  const clearFilter = (column: keyof ColumnFilters) => {
    setActiveFilters(prev => ({ ...prev, [column]: [] }));
  };

  const filteredDespesas = useMemo(() => {
    return despesas.filter(d => {
      const dataFormatada = new Date(d.data).toLocaleDateString('pt-BR');
      const origemFormatada = d.origem === 'manual' ? 'Manual' : 'Leitura';
      const ccNome = getCentroCustoNome(d.centroCustoId);
      const usuarioNome = d.userNameDisplay || '';

      if (activeFilters.data.length > 0 && !activeFilters.data.includes(dataFormatada)) return false;
      if (activeFilters.origem.length > 0 && !activeFilters.origem.includes(origemFormatada)) return false;
      if (activeFilters.centroCusto.length > 0 && !activeFilters.centroCusto.includes(ccNome)) return false;
      if (activeFilters.usuario.length > 0 && !activeFilters.usuario.includes(usuarioNome)) return false;

      return true;
    });
  }, [despesas, activeFilters, centrosCusto]);

  // ---------------

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
        const novaDespesa: DespesaGeral = {
          data: formData.data,
          valor: valorNumerico,
          descricao: formData.descricao.toUpperCase(),
          tipo: formData.tipo,
          centroCustoId: formData.centroCustoId || undefined,
          userId: userProfile?.uid || '',
          userName: userProfile?.name || 'Sistema',
          localidadeId: selectedLocalidade,
          active: true
        };

        await addDoc(collection(db, 'despesasGerais'), novaDespesa);

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

  const handleEdit = (despesa: UnifiedDespesa) => {
    if (despesa.origem !== 'manual') return;

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

  const handleDelete = async (id: string, origem: string) => {
    if (origem !== 'manual') {
      alert('Despesas vindas de leituras devem ser gerenciadas na tela de Leituras/Vendas.');
      return;
    }

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

  const totalDespesas = filteredDespesas.reduce((sum, d) => sum + d.valor, 0);
  const despesasOperacionais = filteredDespesas.filter(d => d.tipo === 'operacional').reduce((sum, d) => sum + d.valor, 0);
  const despesasAdiantamento = filteredDespesas.filter(d => d.tipo === 'adiantamento').reduce((sum, d) => sum + d.valor, 0);

  return (
    <div className="w-full">
      <PageHeader
        title="Gestão de Despesas"
        subtitle="Registre e acompanhe despesas da localidade"
        action={
          <div className="flex gap-3">
            <ButtonPrimary
              onClick={handleOpenCCModal}
              disabled={!isAuthorized}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
            >
              <FolderTree size={20} /> Centro de Custos
            </ButtonPrimary>
            <ButtonPrimary
              onClick={handleOpenModal}
              disabled={!isAuthorized}
              className="flex items-center gap-2"
            >
              <Plus size={20} /> Nova Despesa
            </ButtonPrimary>
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
              <p className="text-gray-600 text-sm font-semibold mb-1">Total de Despesas (Filtrado)</p>
              <p className="text-3xl font-bold text-red-600">R$ {totalDespesas.toFixed(2)}</p>
            </div>
            <DollarSign className="text-red-400" size={40} />
          </div>
        </GlassCard>

        {/* Despesas Operacionais */}
        <GlassCard className="p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold mb-1">Operacionais</p>
              <p className="text-3xl font-bold text-orange-600">R$ {despesasOperacionais.toFixed(2)}</p>
            </div>
            <div className="text-4xl">🏭</div>
          </div>
        </GlassCard>

        {/* Adiantamentos */}
        <GlassCard className="p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold mb-1">Adiantamentos</p>
              <p className="text-3xl font-bold text-yellow-600">R$ {despesasAdiantamento.toFixed(2)}</p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </GlassCard>
      </div>

      {/* Tabela de Despesas */}
      <GlassCard className="p-8 pb-32"> {/* Added padding bottom to allow dropdown space */}
        <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex justify-between items-center">
          <span>Despesas Cadastradas</span>
          <span className="text-sm font-normal text-gray-500 px-3 py-1 bg-slate-100 rounded-full">
            {filteredDespesas.length} registros encontrados
          </span>
        </h2>

        {despesas.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500 text-lg">Nenhuma despesa cadastrada ainda.</p>
            <p className="text-gray-400 text-sm mt-2">Clique em "Nova Despesa" para registrar.</p>
          </div>
        ) : (
          <div className="overflow-visible rounded-xl border border-gray-200"> {/* Allows dropdown overflow */}
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-2 py-1 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                    <HeaderWithFilter
                      label="Data"
                      filterKey="data"
                      values={getUniqueValues('data')}
                      activeFilters={activeFilters}
                      openFilter={openFilter}
                      setOpenFilter={setOpenFilter}
                      toggleFilter={toggleFilter}
                      clearFilter={clearFilter}
                      filterRef={filterRef}
                    />
                  </th>
                  <th className="px-2 py-1 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                    <HeaderWithFilter
                      label="Origem"
                      filterKey="origem"
                      values={getUniqueValues('origemFormatada')}
                      activeFilters={activeFilters}
                      openFilter={openFilter}
                      setOpenFilter={setOpenFilter}
                      toggleFilter={toggleFilter}
                      clearFilter={clearFilter}
                      filterRef={filterRef}
                    />
                  </th>
                  <th className="px-2 py-1 font-semibold text-gray-600 text-xs uppercase tracking-wide">Descrição</th>
                  <th className="px-2 py-1 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                    <HeaderWithFilter
                      label="Centro de Custo"
                      filterKey="centroCusto"
                      values={getUniqueValues('centroCustoNome')}
                      activeFilters={activeFilters}
                      openFilter={openFilter}
                      setOpenFilter={setOpenFilter}
                      toggleFilter={toggleFilter}
                      clearFilter={clearFilter}
                      filterRef={filterRef}
                    />
                  </th>
                  <th className="px-2 py-1 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                    <HeaderWithFilter
                      label="Usuário"
                      filterKey="usuario"
                      values={getUniqueValues('userNameDisplay')}
                      activeFilters={activeFilters}
                      openFilter={openFilter}
                      setOpenFilter={setOpenFilter}
                      toggleFilter={toggleFilter}
                      clearFilter={clearFilter}
                      filterRef={filterRef}
                    />
                  </th>
                  <th className="px-2 py-1 font-semibold text-gray-600 text-xs uppercase tracking-wide text-right">Valor</th>
                  <th className="px-2 py-1 font-semibold text-gray-600 text-xs uppercase tracking-wide text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredDespesas.map((despesa) => (
                  <tr key={despesa.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    {/* Data */}
                    <td className="px-2 py-1 font-medium text-gray-900 text-sm whitespace-nowrap">
                      {new Date(despesa.data).toLocaleDateString('pt-BR')}
                    </td>

                    {/* Origem */}
                    <td className="px-2 py-1">
                      <Badge variant={despesa.origem === 'manual' ? 'primary' : 'secondary'}>
                        {despesa.origem === 'manual' ? 'Manual' : 'Leitura'}
                      </Badge>
                    </td>

                    {/* Descrição */}
                    <td className="px-2 py-1 text-gray-600 flex items-center gap-2 text-sm min-w-[200px]">
                      <div className={`p-1 rounded-lg flex-shrink-0 ${despesa.tipo === 'operacional' ? 'bg-orange-100 text-orange-600' : 'bg-yellow-100 text-yellow-600'}`}>
                        <DollarSign size={14} />
                      </div>
                      <span className="truncate" title={despesa.descricao}>{despesa.descricao}</span>
                    </td>

                    {/* Centro de Custo */}
                    <td className="px-2 py-1 text-gray-600 text-sm whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-xs font-medium">
                        <FolderTree size={12} />
                        {getCentroCustoNome(despesa.centroCustoId)}
                      </span>
                    </td>

                    {/* Usuário */}
                    <td className="px-2 py-1 text-gray-500 text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <User size={12} />
                        {despesa.userNameDisplay}
                      </div>
                    </td>

                    {/* Valor */}
                    <td className="px-2 py-1 text-right font-bold text-red-600 text-sm whitespace-nowrap">
                      R$ {despesa.valor.toFixed(2)}
                    </td>

                    {/* Ações */}
                    <td className="px-2 py-1 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1">
                        {despesa.origem === 'manual' ? (
                          <>
                            <button
                              onClick={() => handleEdit(despesa)}
                              disabled={!isAuthorized}
                              className="p-1 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors disabled:opacity-50"
                              title="Editar"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(despesa.id || '', despesa.origem)}
                              disabled={!isAuthorized}
                              className="p-1 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors disabled:opacity-50"
                              title="Desativar"
                            >
                              <Ban size={14} />
                            </button>
                          </>
                        ) : (
                          <div title="Gerenciado em Leituras" className="p-1 text-gray-400 cursor-help">
                            <Info size={14} />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Modal Nova Despesa */}
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
          <InputField
            label="Data"
            type="date"
            value={formData.data}
            onChange={(e) => setFormData({ ...formData, data: e.target.value })}
            disabled={!isAuthorized}
            required
          />

          <InputField
            label="Descrição"
            placeholder="Ex: MATERIAL DE LIMPEZA"
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value.toUpperCase() })}
            disabled={!isAuthorized}
            required
          />

          <SelectField
            label="Centro de Custo"
            value={formData.centroCustoId}
            onChange={(e) => setFormData({ ...formData, centroCustoId: e.target.value })}
            disabled={!isAuthorized}
            options={[
              { value: '', label: 'Nenhum' },
              ...centrosCusto.map(cc => ({ value: cc.id || '', label: cc.nome }))
            ]}
          />

          <InputField
            label="Valor (R$)"
            type="number"
            step="0.01"
            min="0"
            value={formData.valor}
            onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })}
            disabled={!isAuthorized}
            required
            placeholder="0.00"
          />

          <SelectField
            label="Tipo de Despesa"
            value={formData.tipo}
            onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'operacional' | 'adiantamento' })}
            disabled={!isAuthorized}
            required
            options={[
              { value: 'operacional', label: '🏭 Operacional' },
              { value: 'adiantamento', label: '💰 Adiantamento' }
            ]}
          />
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
            <label className="block text-sm font-semibold text-gray-600 mb-2">
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
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              Descrição (Opcional)
            </label>
            <textarea
              placeholder="DESCRIÇÃO DETALHADA DO CENTRO DE CUSTO"
              value={ccFormData.descricao}
              onChange={(e) => setCCFormData({ ...ccFormData, descricao: e.target.value.toUpperCase() })}
              disabled={!isAuthorized}
              rows={3}
              className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 resize-none uppercase"
            />
          </div>

          {/* Lista de Centros de Custo Existentes */}
          {!editingCCId && centrosCusto.length > 0 && (
            <div className="border-t border-slate-200 pt-4 mt-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-3">Centros de Custo Cadastrados</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {centrosCusto.map((cc) => (
                  <div key={cc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{cc.nome}</p>
                      {cc.descricao && <p className="text-xs text-gray-500 mt-1">{cc.descricao}</p>}
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
