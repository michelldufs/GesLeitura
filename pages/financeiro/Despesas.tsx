import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalidade } from '../../contexts/LocalidadeContext';
import { getTodayDateString, formatDateToString } from '../../utils/dateUtils';
import { db } from '../../services/firebaseConfig';
import { formatCurrency } from '../../utils/formatters';
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
  X,
  CreditCard,
  Target
} from 'lucide-react';
import { DespesaGeral, CentroCusto, UserProfile, Ponto } from '../../types.ts';

// Tipo unificado para exibição na tabela
interface UnifiedDespesa extends DespesaGeral {
  origem: 'manual' | 'leitura';
  vendaId?: string;
  userNameDisplay?: string;
  pontoId?: string; // ID do ponto se vier de leitura
}

// Filtros para as colunas
interface ColumnFilters {
  data: string[];
  origem: string[];
  centroCusto: string[]; // Mantendo compatibilidade ou renomeando se preferir, vou usar centroCusto para o filtro genérico antigo se sobrar, mas idealmente split
  ponto: string[];       // Add this
  centroCustoReal: string[]; // Add this
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
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [pontosMap, setPontosMap] = useState<Record<string, string>>({}); // ID -> Nome
  const [pontosCodigoMap, setPontosCodigoMap] = useState<Record<string, string>>({}); // ID -> Código

  // Filter States
  const [activeFilters, setActiveFilters] = useState<ColumnFilters>({
    data: [],
    origem: [],
    centroCusto: [],
    ponto: [],
    centroCustoReal: [],
    usuario: []
  });

  // Estado para modal de confirmação de baixa
  const [confirmarBaixa, setConfirmarBaixa] = useState<any>(null);
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
    valor: string;
    descricao: string;
    tipo: 'operacional' | 'adiantamento';
    centroCustoId: string;
  }>({
    data: getTodayDateString(),
    valor: '',
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
      loadPontos();
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

  const loadPontos = async () => {
    if (!selectedLocalidade) return;
    try {
      const q = query(collection(db, 'pontos'), where('localidadeId', '==', selectedLocalidade));
      const snapshot = await getDocs(q);
      const nomeMap: Record<string, string> = {};
      const codigoMap: Record<string, string> = {};
      const lista: Ponto[] = [];
      snapshot.forEach(doc => {
        const data = doc.data() as Ponto;
        data.id = doc.id;
        lista.push(data);
        nomeMap[doc.id] = data.nome;
        codigoMap[doc.id] = data.codigo || 'S/C';
      });
      setPontos(lista);
      setPontosMap(nomeMap);
      setPontosCodigoMap(codigoMap);
    } catch (e) { console.error(e); }
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
        collection(db, 'despesas_gerais'),
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
            descricao: 'DESPESA DE MÁQUINA',
            userId: data.userId,
            localidadeId: data.localidadeId,
            tipo: 'operacional',
            centroCustoId: data.centroCustoId,
            active: true,
            origem: 'leitura',
            vendaId: doc.id,
            userNameDisplay: usersMap[data.userId] || 'Leiturista',
            pontoId: data.pontoId // Important: Getting point ID from sale
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

  const getUniqueValues = (key: keyof UnifiedDespesa | 'centroCustoNome' | 'origemFormatada' | 'pontoNome' | 'centroCustoReal') => {
    const values = new Set<string>();
    despesas.forEach(d => {
      let value = '';
      if (key === 'pontoNome') {
        if (d.origem === 'leitura' && d.pontoId && pontosMap[d.pontoId]) {
          value = pontosMap[d.pontoId];
        }
      } else if (key === 'centroCustoReal') {
        if (d.origem === 'manual') {
          value = getCentroCustoNome(d.centroCustoId);
        } else if (d.origem === 'leitura') {
          // Leitura também tem centro de custo vindo da venda
          value = getCentroCustoNome(d.centroCustoId);
        }
      } else if (key === 'origemFormatada') {
        value = d.origem === 'manual' ? 'Manual' : 'Leitura';
      } else if (key === 'data') {
        value = new Date(d.data).toLocaleDateString('pt-BR');
      } else {
        value = String(d[key as keyof UnifiedDespesa] || '');
      }

      if (value && value !== '-' && value !== 'S/C') values.add(value);
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
      const pontoNome = d.pontoId ? pontosMap[d.pontoId] : '';
      const ccNome = getCentroCustoNome(d.centroCustoId);
      const usuarioNome = d.userNameDisplay || '';

      if (activeFilters.data.length > 0 && !activeFilters.data.includes(dataFormatada)) return false;
      if (activeFilters.origem.length > 0 && !activeFilters.origem.includes(origemFormatada)) return false;
      if (activeFilters.ponto.length > 0 && !activeFilters.ponto.includes(pontoNome)) return false;
      if (activeFilters.centroCustoReal.length > 0 && !activeFilters.centroCustoReal.includes(ccNome)) return false;
      if (activeFilters.usuario.length > 0 && !activeFilters.usuario.includes(usuarioNome)) return false;

      return true;
    });
  }, [despesas, activeFilters, centrosCusto, pontosMap]);

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
        await updateDoc(doc(db, 'despesas_gerais', editingId), {
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

        await addDoc(collection(db, 'despesas_gerais'), novaDespesa);

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
      await updateDoc(doc(db, 'despesas_gerais', id), { active: false });
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
          <div className="flex gap-2">
            <button
              onClick={handleOpenCCModal}
              disabled={!isAuthorized}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 text-sm font-medium transition-all shadow-sm disabled:opacity-50"
            >
              <FolderTree size={16} className="text-purple-600" />
              <span className="hidden sm:inline">Centro de Custos</span>
            </button>
            <ButtonPrimary
              onClick={handleOpenModal}
              disabled={!isAuthorized}
            >
              <Plus size={16} />
              <span>Nova Despesa</span>
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

      {/* Resumo de Despesas - Compacto */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {/* Total Geral */}
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Total</p>
            <h3 className="text-lg font-bold text-gray-900">R$ {formatCurrency(totalDespesas)}</h3>
          </div>
          <div className="p-2 bg-rose-50 rounded-lg text-rose-500">
            <CreditCard size={18} />
          </div>
        </div>

        {/* Despesas Operacionais */}
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Operacionais</p>
            <h3 className="text-lg font-bold text-gray-900">R$ {formatCurrency(despesasOperacionais)}</h3>
          </div>
          <div className="p-2 bg-orange-50 rounded-lg text-orange-500">
            <Target size={18} />
          </div>
        </div>

        {/* Adiantamentos */}
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Adiantamentos</p>
            <h3 className="text-lg font-bold text-gray-900">R$ {formatCurrency(despesasAdiantamento)}</h3>
          </div>
          <div className="p-2 bg-yellow-50 rounded-lg text-yellow-500">
            <DollarSign size={18} />
          </div>
        </div>
      </div>

      {/* Tabela de Despesas */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-sm font-semibold text-gray-700">Despesas Cadastradas</h2>
          <span className="text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200 shadow-sm">
            {filteredDespesas.length} registros
          </span>
        </div>

        {despesas.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="mx-auto text-gray-300 mb-4" size={32} />
            <p className="text-gray-500 text-sm">Nenhuma despesa cadastrada.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 font-semibold">
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
                  <th className="px-3 py-2 font-semibold text-gray-600">Descrição</th>
                  <th className="px-3 py-2 font-semibold text-right">Valor</th>
                  <th className="px-3 py-2 font-semibold">
                    <HeaderWithFilter
                      label="Centro de Custo"
                      filterKey="centroCustoReal"
                      values={getUniqueValues('centroCustoReal')}
                      activeFilters={activeFilters}
                      openFilter={openFilter}
                      setOpenFilter={setOpenFilter}
                      toggleFilter={toggleFilter}
                      clearFilter={clearFilter}
                      filterRef={filterRef}
                    />
                  </th>
                  <th className="px-3 py-2 font-semibold text-gray-600">Tipo</th>
                  <th className="px-3 py-2 font-semibold">
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
                  <th className="px-3 py-2 font-semibold">
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
                  <th className="px-3 py-2 font-semibold text-center">Status</th>
                  <th className="px-3 py-2 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredDespesas.map((despesa) => {
                  const centroCustoNome = getCentroCustoNome(despesa.centroCustoId);
                  // Status: pago, agendado, pendente
                  let status = 'Pendente';
                  if (despesa.status === 'pago') status = 'Pago';
                  else if (despesa.status === 'agendado') status = 'Agendado';
                  else if (despesa.dataPagamento) status = 'Pago';

                  return (
                      <tr key={despesa.id} className="hover:bg-gray-50 transition-colors">
                        {/* Data */}
                        <td className="px-3 py-2 font-medium text-gray-700 whitespace-nowrap">
                          {new Date(despesa.data).toLocaleDateString('pt-BR')}
                        </td>
                        {/* Descrição */}
                        <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate" title={despesa.descricao}>
                          {despesa.descricao}
                        </td>
                        {/* Valor */}
                        <td className="px-3 py-2 text-right font-bold text-red-600 whitespace-nowrap">
                          - {formatCurrency(despesa.valor)}
                        </td>
                        {/* Centro de Custo */}
                        <td className="px-3 py-2 text-gray-700 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]" title={centroCustoNome}>
                          {centroCustoNome}
                        </td>
                        {/* Tipo */}
                        <td className="px-3 py-2 text-gray-500 text-xs uppercase whitespace-nowrap">
                          {despesa.tipo === 'operacional' ? 'Operacional' : 'Adiantamento'}
                        </td>
                        {/* Origem */}
                        <td className="px-3 py-2">
                          {despesa.origem === 'manual' ? (
                            <Badge variant="primary" className="text-[10px] px-1.5 py-0.5">MANUAL</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">LEITURA</Badge>
                          )}
                        </td>
                        {/* Usuário */}
                        <td className="px-3 py-2 text-gray-500 text-[10px] uppercase truncate max-w-[100px]" title={despesa.userNameDisplay}>
                          {despesa.userNameDisplay}
                        </td>
                        {/* Status */}
                        <td className="px-3 py-2 text-center">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${status === 'Pago' ? 'bg-emerald-100 text-emerald-700' : status === 'Agendado' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>{status}</span>
                        </td>
                        {/* Ações */}
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <div className="flex justify-end gap-1">
                            {despesa.origem === 'manual' ? (
                              <>
                                <button
                                  onClick={() => handleEdit(despesa)}
                                  disabled={!isAuthorized}
                                  className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                                  title="Editar"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDelete(despesa.id!, despesa.origem)}
                                  disabled={!isAuthorized}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                                  title="Excluir"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic px-2">Auto</span>
                            )}
                          </div>
                        </td>
                      </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nova Despesa */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingId ? 'Editar Despesa' : 'Nova Despesa'}
        actions={
          <div className="flex gap-2 justify-end mt-2">
            <ButtonPrimary onClick={handleSubmit} disabled={loading} type="submit" className="px-4 py-1 text-sm">
              {loading ? 'Salvando...' : 'Salvar'}
            </ButtonPrimary>
            <ButtonSecondary onClick={handleCloseModal} className="px-4 py-1 text-sm">
              Cancelar
            </ButtonSecondary>
          </div>
        }
      >

        <form onSubmit={handleSubmit} className="space-y-2 text-sm">
          <InputField
            label="Data"
            type="date"
            value={formData.data}
            onChange={(e) => setFormData({ ...formData, data: e.target.value })}
            disabled={!isAuthorized}
            required
            className="py-1 px-2 text-sm"
            inputClassName="py-1 px-2 text-sm"
            min={getTodayDateString()}
          />

          <InputField
            label="Descrição"
            placeholder="Ex: MATERIAL DE LIMPEZA"
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value.toUpperCase() })}
            disabled={!isAuthorized}
            required
            className="py-1 px-2 text-sm"
            inputClassName="py-1 px-2 text-sm"
          />

          <div className="flex gap-2">
            <div className="flex-1">
              <SelectField
                label="Centro de Custo"
                value={formData.centroCustoId}
                onChange={(e) => setFormData({ ...formData, centroCustoId: e.target.value })}
                disabled={!isAuthorized}
                options={[
                  { value: '', label: 'Nenhum' },
                  ...centrosCusto.map(cc => ({ value: cc.id || '', label: cc.nome }))
                ]}
                className="py-1 px-2 text-sm"
                selectClassName="py-1 px-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <InputField
                label="Valor (R$)"
                type="number"
                step="0.01"
                min="0"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                disabled={!isAuthorized}
                required
                placeholder="Digite o valor"
                className="py-1 px-2 text-sm"
                inputClassName="py-1 px-2 text-sm"
              />
            </div>
          </div>

          {/* Toggle Despesa Parcelada */}
          <div className="flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              id="parcelada"
              checked={!!formData.parcelada}
              onChange={e => setFormData(f => ({ ...f, parcelada: e.target.checked, qtdParcelas: 1, dataPrimeiroVencimento: f.data, primeiraPaga: false }))}
              disabled={!isAuthorized}
            />
            <label htmlFor="parcelada" className="text-sm font-medium text-gray-700 select-none">Despesa Parcelada?</label>
          </div>

          {formData.parcelada && (
            <div className="grid grid-cols-2 gap-2">
              <InputField
                label="Qtd Parcelas"
                type="number"
                min="2"
                value={formData.qtdParcelas}
                onChange={e => setFormData(f => ({ ...f, qtdParcelas: Math.max(2, parseInt(e.target.value) || 2) }))}
                disabled={!isAuthorized}
                required
                className="py-1 px-2 text-sm"
                inputClassName="py-1 px-2 text-sm"
              />
              <InputField
                label="Data 1º Vencimento"
                type="date"
                value={formData.dataPrimeiroVencimento}
                onChange={e => setFormData(f => ({ ...f, dataPrimeiroVencimento: e.target.value }))}
                disabled={!isAuthorized}
                required
                className="py-1 px-2 text-sm"
                inputClassName="py-1 px-2 text-sm"
              />
              <SelectField
                label="Frequência"
                value={formData.frequencia || 'mensal'}
                onChange={e => setFormData(f => ({ ...f, frequencia: e.target.value as 'mensal' | 'quinzenal' | 'semanal' }))}
                options={[
                  { value: 'mensal', label: 'Mensal' },
                  { value: 'quinzenal', label: 'Quinzenal' },
                  { value: 'semanal', label: 'Semanal' }
                ]}
                className="py-1 px-2 text-sm col-span-2"
                selectClassName="py-1 px-2 text-sm"
                disabled={!isAuthorized}
              />
              <div className="flex items-center gap-2 col-span-2 mt-1">
                <input
                  type="checkbox"
                  id="primeiraPaga"
                  checked={!!formData.primeiraPaga}
                  onChange={e => setFormData(f => ({ ...f, primeiraPaga: e.target.checked }))}
                  disabled={!isAuthorized}
                />
                <label htmlFor="primeiraPaga" className="text-xs font-medium text-gray-700 select-none">1ª parcela já paga?</label>
              </div>
            </div>
          )}

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
            className="py-1 px-2 text-sm"
            selectClassName="py-1 px-2 text-sm"
          />
              {/* Modal de Confirmação de Baixa */}
              {typeof window !== 'undefined' && confirmarBaixa && (
                <Modal
                  isOpen={true}
                  onClose={() => setConfirmarBaixa(null)}
                  title="Efetivar Pagamento"
                  actions={
                    <div className="flex gap-3">
                      <ButtonPrimary
                        onClick={async () => {
                          setLoading(true);
                          try {
                            const despesaRef = doc(db, 'despesas_gerais', confirmarBaixa.id);
                            await updateDoc(despesaRef, {
                              status: 'pago',
                              dataPagamento: new Date().toISOString().split('T')[0]
                            });
                            setMessageType('success');
                            setMessage('Pagamento efetivado!');
                            setConfirmarBaixa(null);
                            loadData();
                          } catch (err) {
                            setMessageType('error');
                            setMessage('Erro ao efetivar pagamento.');
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={loading}
                      >
                        Confirmar Pagamento
                      </ButtonPrimary>
                      <ButtonSecondary onClick={() => setConfirmarBaixa(null)}>Cancelar</ButtonSecondary>
                    </div>
                  }
                >
                  <div className="py-4">
                    <p className="text-gray-700 text-lg font-semibold mb-2">Confirmar pagamento desta despesa?</p>
                    <p className="text-gray-600">Valor: <span className="font-bold text-emerald-700">{confirmarBaixa.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></p>
                    <p className="text-gray-500 text-sm mt-2">A data de pagamento será registrada como hoje.</p>
                  </div>
                </Modal>
              )}
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
