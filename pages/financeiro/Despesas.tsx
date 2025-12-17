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
  Modal,
  Pagination // Added
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
  Target,
  Calendar,
  Clock,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Lock // Added Lock icon
} from 'lucide-react';
import { DespesaGeral, CentroCusto, UserProfile, Ponto } from '../../types.ts';
import { addDays, addMonths, addWeeks, differenceInDays, parseISO } from 'date-fns';

const isDateLocked = (dateString: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expenseDate = new Date(dateString);
  expenseDate.setHours(0, 0, 0, 0);

  // Lock if expense date comes BEFORE today
  // expense < today = Locked
  // expense >= today = Unlocked
  // Note: Due to timezone potential issues, ensure we compare correctly. 
  // Usually dateString '2025-12-16' becomes UTC midnight or Local midnight depending on creation.
  // Let's use string comparison for safety if format is consistent 'YYYY-MM-DD'
  // But relying on Date object with setHours is safer for "logical day" comparison.
  return expenseDate.getTime() < today.getTime();
};

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
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [showCCModal, setShowCCModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCCId, setEditingCCId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [notification, setNotification] = useState<{ message: string, count: number } | null>(null);

  const [formData, setFormData] = useState<{
    data: string;
    valor: number | string;
    descricao: string;
    tipo: 'operacional' | 'adiantamento';
    centroCustoId: string;
    recorrencia: 'nenhuma' | 'semanal' | 'quinzenal' | 'mensal';
    frenquenciaParcelas: number;
    status: 'paga' | 'pendente';
  }>({
    data: new Date().toISOString().split('T')[0],
    valor: '',
    descricao: '',
    tipo: 'operacional',
    centroCustoId: '',
    recorrencia: 'nenhuma' as 'nenhuma' | 'semanal' | 'quinzenal' | 'mensal',
    frenquenciaParcelas: 1, // Quantidade de vezes
    status: 'paga' as 'paga' | 'pendente'
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

      // Check for due expenses (Notification Logic)
      const hoje = new Date();
      const despesasVencendo = allDespesas.filter(d => {
        if (d.status !== 'pendente') return false;
        const dataVencimento = parseISO(d.data);
        const diasParaVencer = differenceInDays(dataVencimento, hoje);
        return diasParaVencer >= 0 && diasParaVencer <= 2; // Hoje, Amanhã ou Depois de Amanhã
      });

      if (despesasVencendo.length > 0) {
        setNotification({
          message: `Atenção: Você tem ${despesasVencendo.length} despesa(s) vencendo nos próximos 2 dias.`,
          count: despesasVencendo.length
        });
      } else {
        setNotification(null);
      }

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
      valor: '',
      descricao: '',
      tipo: 'operacional',
      centroCustoId: '',
      recorrencia: 'nenhuma',
      frenquenciaParcelas: 1,
      status: 'paga'
    });
    setEditingId(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      data: new Date().toISOString().split('T')[0],
      valor: '',
      descricao: '',
      tipo: 'operacional',
      centroCustoId: '',
      recorrencia: 'nenhuma',
      frenquenciaParcelas: 1,
      status: 'paga'
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




  const calculateDate = (startDate: string, frequency: string, index: number) => {
    const datesStart = new Date(startDate + 'T00:00:00'); // T00:00:00 to avoid timezone issues
    let newDate = datesStart;

    if (frequency === 'semanal') {
      newDate = addWeeks(datesStart, index);
    } else if (frequency === 'quinzenal') {
      newDate = addDays(datesStart, index * 15);
    } else if (frequency === 'mensal') {
      newDate = addMonths(datesStart, index);
    }
    return newDate.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valorNumerico = parseFloat(formData.valor as any) || 0;

    if (!selectedLocalidade) {
      alert('Selecione uma localidade antes de continuar.');
      return;
    }
    if (!formData.descricao.trim()) {
      alert('Por favor, informe uma descrição.');
      return;
    }
    if (valorNumerico <= 0) {
      alert('O valor da despesa deve ser maior que zero.');
      return;
    }

    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      if (editingId) {
        // Edit flow (Single update for now - simplified)
        await updateDoc(doc(db, 'despesas_gerais', editingId), {
          data: formData.data,
          valor: valorNumerico,
          descricao: formData.descricao.toUpperCase(),
          tipo: formData.tipo,
          centroCustoId: formData.centroCustoId || null,
          status: formData.status
        });
        setMessageType('success');
        setMessage('Despesa atualizada com sucesso!');
      } else {
        // Create flow - Handle Recurrence
        const { recorrencia, frenquenciaParcelas } = formData;
        const isRecorrente = recorrencia !== 'nenhuma' && frenquenciaParcelas > 1;

        if (isRecorrente) {
          const batchPromises = [];
          const groupId = doc(collection(db, 'despesas_gerais')).id; // Generate a common ID for grouping if needed, or just let them be independent

          for (let i = 0; i < frenquenciaParcelas; i++) {
            const dataParcela = calculateDate(formData.data, recorrencia, i);
            const descricaoParcela = `${formData.descricao.toUpperCase()} (${i + 1}/${frenquenciaParcelas})`;

            const novaDespesa: DespesaGeral = {
              data: dataParcela,
              valor: valorNumerico, // Assuming value is PER INSTALLMENT. If total, divide. usually user enters value per installment.
              descricao: descricaoParcela,
              tipo: formData.tipo,
              centroCustoId: formData.centroCustoId || undefined,
              userId: userProfile?.uid || '',
              userName: userProfile?.name || 'Sistema',
              localidadeId: selectedLocalidade,
              active: true,
              recorrencia: recorrencia,
              parcelaAtual: i + 1,
              totalParcelas: frenquenciaParcelas,
              idDespesaPai: groupId,
              status: formData.status // All start with selected status (usually pendente for future?)
            };
            batchPromises.push(addDoc(collection(db, 'despesas_gerais'), novaDespesa));
          }
          await Promise.all(batchPromises);
          setMessage(`${frenquenciaParcelas} despesas criadas com sucesso!`);
        } else {
          // Single expense
          const novaDespesa: DespesaGeral = {
            data: formData.data,
            valor: valorNumerico,
            descricao: formData.descricao.toUpperCase(),
            tipo: formData.tipo,
            centroCustoId: formData.centroCustoId || undefined,
            userId: userProfile?.uid || '',
            userName: userProfile?.name || 'Sistema',
            localidadeId: selectedLocalidade,
            active: true,
            status: formData.status
          };
          await addDoc(collection(db, 'despesas_gerais'), novaDespesa);
          setMessage('Despesa criada com sucesso!');
        }
        setMessageType('success');
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

  const handleToggleStatus = async (despesa: UnifiedDespesa) => {
    const novoStatus = despesa.status === 'pendente' ? 'paga' : 'pendente';
    const acao = novoStatus === 'paga' ? 'marcar como PAGA' : 'marcar como PENDENTE';

    // Simplest confirmation
    if (!window.confirm(`Deseja realmente ${acao} a despesa "${despesa.descricao}"?`)) {
      return;
    }

    try {
      await updateDoc(doc(db, 'despesas_gerais', despesa.id!), {
        status: novoStatus
      });
      loadData(); // Reload to reflect changes and re-calculate totals
      setMessageType('success');
      setMessage(`Despesa atualizada para ${novoStatus.toUpperCase()}!`);
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao atualizar status.");
    }
  };

  const handleEdit = (despesa: UnifiedDespesa) => {
    if (despesa.origem !== 'manual') return;

    setFormData({
      data: despesa.data,
      valor: despesa.valor,
      descricao: despesa.descricao,
      tipo: despesa.tipo,
      centroCustoId: despesa.centroCustoId || '',
      recorrencia: despesa.recorrencia || 'nenhuma',
      frenquenciaParcelas: despesa.totalParcelas || 1,
      status: despesa.status || 'paga'
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

  /* 
    Adjusted Calculation:
    totalRealizado -> Sum of expenses that are NOT 'pendente'
    totalPendente  -> Sum of expenses that ARE 'pendente'
  */
  const totalDespesas = filteredDespesas
    .filter(d => d.status !== 'pendente')
    .reduce((sum, d) => sum + d.valor, 0);

  const totalPendente = filteredDespesas
    .filter(d => d.status === 'pendente')
    .reduce((sum, d) => sum + d.valor, 0);

  const despesasOperacionais = filteredDespesas
    .filter(d => d.tipo === 'operacional' && d.status !== 'pendente')
    .reduce((sum, d) => sum + d.valor, 0);

  const despesasAdiantamento = filteredDespesas
    .filter(d => d.tipo === 'adiantamento' && d.status !== 'pendente')
    .reduce((sum, d) => sum + d.valor, 0);

  // --- Grouping Logic ---
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const groupedDespesas = useMemo(() => {
    const groups: Record<string, UnifiedDespesa[]> = {};
    const singles: UnifiedDespesa[] = [];
    const result: { type: 'group' | 'single', data: UnifiedDespesa | UnifiedDespesa[] }[] = [];

    // 1. Group by idDespesaPai
    filteredDespesas.forEach(d => {
      if (d.idDespesaPai) {
        if (!groups[d.idDespesaPai]) groups[d.idDespesaPai] = [];
        groups[d.idDespesaPai].push(d);
      } else {
        singles.push(d);
      }
    });

    // 2. Process Groups
    Object.keys(groups).forEach(groupId => {
      const groupItems = groups[groupId];
      // Sort items in group by date
      groupItems.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

      if (groupItems.length > 0) {
        result.push({ type: 'group', data: groupItems });
      }
    });

    // 3. Add Singles
    singles.forEach(s => result.push({ type: 'single', data: s }));

    // 4. Sort everything by Date (using first item date for groups)
    result.sort((a, b) => {
      const dateA = a.type === 'group' ? (a.data as UnifiedDespesa[])[0].data : (a.data as UnifiedDespesa).data;
      const dateB = b.type === 'group' ? (b.data as UnifiedDespesa[])[0].data : (b.data as UnifiedDespesa).data;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return result;
  }, [filteredDespesas]);

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

      {notification && (
        <div className="mb-6 animate-pulse">
          <AlertBox
            type="warning"
            message={notification.message}
          />
        </div>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {/* Total Geral */}
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Total Realizado</p>
            <h3 className="text-lg font-bold text-gray-900">R$ {totalDespesas.toFixed(2)}</h3>
          </div>
          <div className="p-2 bg-rose-50 rounded-lg text-rose-500">
            <CreditCard size={18} />
          </div>
        </div>

        {/* Agendado / Pendente */}
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow border-l-4 border-l-purple-400">
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Agendado (Futuro)</p>
            <h3 className="text-lg font-bold text-gray-900">R$ {totalPendente.toFixed(2)}</h3>
          </div>
          <div className="p-2 bg-purple-50 rounded-lg text-purple-500">
            <Calendar size={18} />
          </div>
        </div>

        {/* Despesas Operacionais */}
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Operacionais</p>
            <h3 className="text-lg font-bold text-gray-900">R$ {despesasOperacionais.toFixed(2)}</h3>
          </div>
          <div className="p-2 bg-orange-50 rounded-lg text-orange-500">
            <Target size={18} />
          </div>
        </div>

        {/* Adiantamentos */}
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Adiantamentos</p>
            <h3 className="text-lg font-bold text-gray-900">R$ {despesasAdiantamento.toFixed(2)}</h3>
          </div>
          <div className="p-2 bg-yellow-50 rounded-lg text-yellow-500">
            <DollarSign size={18} />
          </div>
        </div>
      </div>

      {/* SEÇÃO 1: DESPESAS RECORRENTES (GAVETAS) */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Clock className="text-purple-600" size={20} />
          Despesas Recorrentes
        </h2>
        <div className="bg-white border border-purple-100 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-purple-100 flex justify-between items-center bg-purple-50/30">
            <span className="text-xs font-medium text-purple-700">
              Contratos e Parcelamentos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-purple-50/50 text-purple-900 border-b border-purple-100">
                <tr>
                  <th className="px-3 py-2 font-semibold">Data / Vencimento</th>
                  <th className="px-3 py-2 font-semibold" colSpan={4}>Descrição do Grupo</th>
                  <th className="px-3 py-2 font-semibold text-center">Tipo</th>
                  <th className="px-3 py-2 font-semibold text-right">Total da Série</th>
                  <th className="px-3 py-2 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50">
                {groupedDespesas.filter(item => item.type === 'group').length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400 italic">
                      Nenhuma despesa recorrente encontrada.
                    </td>
                  </tr>
                ) : (
                  groupedDespesas.filter(item => item.type === 'group').map((item) => {
                    const groupItems = item.data as UnifiedDespesa[];
                    const groupId = groupItems[0].idDespesaPai!;
                    const isExpanded = expandedGroups[groupId];
                    const groupTotal = groupItems.reduce((acc, curr) => acc + curr.valor, 0);
                    const groupDate = groupItems[0].data;
                    const groupDesc = groupItems[0].descricao.replace(/\(\d+\/\d+\)/, '').trim();
                    const groupCount = groupItems.length;

                    return (
                      <React.Fragment key={groupId}>
                        <tr
                          className="bg-white hover:bg-purple-50 cursor-pointer transition-colors border-b border-purple-50"
                          onClick={() => toggleGroup(groupId)}
                        >
                          <td className="px-3 py-3 font-medium text-gray-700 whitespace-nowrap flex items-center gap-2">
                            {isExpanded ? <ChevronDown size={16} className="text-purple-500" /> : <ChevronRight size={16} className="text-gray-400" />}
                            {new Date(groupDate).toLocaleDateString('pt-BR')}
                          </td>
                          <td colSpan={4} className="px-3 py-3 font-semibold text-gray-800">
                            {groupDesc}
                            <span className="ml-2 text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                              {groupCount} parcelas
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center text-[10px] uppercase text-gray-500">
                            Recorrente
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-gray-700 whitespace-nowrap">
                            {groupTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="px-3 py-2 text-right text-[10px] text-purple-500 italic">
                            {isExpanded ? 'Ocultar' : 'Ver parcelas'}
                          </td>
                        </tr>
                        {isExpanded && groupItems.map(despesa => {
                          const isLocked = isDateLocked(despesa.data);
                          return (
                            <tr key={despesa.id} className="bg-purple-50/30 hover:bg-purple-50 border-l-4 border-l-purple-400">
                              <td className="px-3 py-2 pl-8 font-medium text-gray-600 whitespace-nowrap text-xs">
                                {despesa.data.split('-').reverse().join('/')}
                                {isLocked && <Lock size={10} className="inline ml-1 text-gray-400" title="Data fechada (Passado)" />}
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-500 text-center">-</td>
                              <td className="px-3 py-2 text-xs text-gray-500 text-center">-</td>
                              <td className="px-3 py-2 text-gray-500 text-xs">{getCentroCustoNome(despesa.centroCustoId)}</td>
                              <td className="px-3 py-2 text-gray-600 text-xs max-w-[200px] truncate">{despesa.descricao}</td>
                              <td className="px-3 py-2 text-gray-500 text-[10px] uppercase">{despesa.userNameDisplay}</td>
                              <td className="px-3 py-2 text-right font-medium text-red-500 text-xs">
                                - {despesa.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                              <td className="px-3 py-2 text-center whitespace-nowrap">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleToggleStatus(despesa); }}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all shadow-sm ${despesa.status === 'pendente'
                                    ? 'bg-white text-orange-600 border-orange-200 hover:bg-orange-50 hover:border-orange-300'
                                    : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                    }`}
                                >
                                  {despesa.status === 'pendente' ? (
                                    <>
                                      <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                                      Pendente
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle size={12} />
                                      Paga
                                    </>
                                  )}
                                </button>
                              </td>
                              <td className="px-3 py-2 text-right whitespace-nowrap">
                                <div className="flex justify-end gap-1">
                                  {isLocked ? (
                                    <span className="p-1 text-gray-300 cursor-not-allowed" title="Edição bloqueada (Data Passada)">
                                      <Lock size={12} />
                                    </span>
                                  ) : (
                                    <>
                                      <button onClick={(e) => { e.stopPropagation(); handleEdit(despesa); }} disabled={!isAuthorized} className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"><Edit2 size={12} /></button>
                                      <button onClick={(e) => { e.stopPropagation(); handleDelete(despesa.id!, despesa.origem); }} disabled={!isAuthorized} className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"><Trash2 size={12} /></button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: DESPESAS CADASTRAAS (SIMPLES) */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <DollarSign size={16} className="text-gray-400" />
            Despesas Avulsas (Do Dia-a-Dia)
          </h2>
          <span className="text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200 shadow-sm">
            {groupedDespesas.filter(i => i.type === 'single').length} registros
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

                  {/* Nova Coluna: Código do Ponto */}
                  <th className="px-3 py-2 font-semibold text-gray-600">Cód.</th>

                  {/* Coluna Ponto */}
                  <th className="px-3 py-2 font-semibold">
                    <HeaderWithFilter
                      label="Ponto"
                      filterKey="ponto"
                      values={getUniqueValues('pontoNome')}
                      activeFilters={activeFilters}
                      openFilter={openFilter}
                      setOpenFilter={setOpenFilter}
                      toggleFilter={toggleFilter}
                      clearFilter={clearFilter}
                      filterRef={filterRef}
                    />
                  </th>

                  {/* Coluna Centro de Custo */}
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

                  <th className="px-3 py-2 font-semibold text-gray-600">Descrição</th>

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
                  <th className="px-3 py-2 font-semibold text-right">Valor</th>
                  <th className="px-3 py-2 font-semibold text-center">Status</th>
                  <th className="px-3 py-2 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(() => {
                  const avulsas = groupedDespesas.filter(i => i.type === 'single');
                  const totalPages = Math.ceil(avulsas.length / ITEMS_PER_PAGE);
                  const paginated = avulsas.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

                  if (avulsas.length > 0 && paginated.length === 0 && currentPage > 1) {
                    setCurrentPage(1); // Reset if current page is empty
                  }

                  return (
                    <>
                      {paginated.map((item) => {
                        const despesa = item.data as UnifiedDespesa;
                        const pontoCodigo = despesa.pontoId ? pontosCodigoMap[despesa.pontoId] : '-';
                        const pontoNome = despesa.pontoId ? pontosMap[despesa.pontoId] : '-';
                        const centroCustoNome = getCentroCustoNome(despesa.centroCustoId);
                        const isLocked = isDateLocked(despesa.data);

                        return (
                          <tr key={despesa.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-3 py-2 font-medium text-gray-700 whitespace-nowrap">
                              {despesa.data.split('-').reverse().join('/')}
                              {isLocked && <Lock size={12} className="inline ml-1 text-gray-400" title="Data fechada (Passado)" />}
                            </td>
                            <td className="px-3 py-2">
                              {despesa.origem === 'manual' ? (
                                <Badge variant="primary" className="text-[10px] px-1.5 py-0.5">MANUAL</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">LEITURA</Badge>
                              )}
                            </td>
                            <td className="px-3 py-2 text-gray-700 font-medium whitespace-nowrap">{pontoCodigo}</td>
                            <td className="px-3 py-2 text-gray-700 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]" title={pontoNome}>{pontoNome}</td>
                            <td className="px-3 py-2 text-gray-700 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]" title={centroCustoNome}>{centroCustoNome}</td>
                            <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate" title={despesa.descricao}>{despesa.descricao}</td>
                            <td className="px-3 py-2 text-gray-500 text-[10px] uppercase truncate max-w-[100px]" title={despesa.userNameDisplay}>{despesa.userNameDisplay}</td>
                            <td className="px-3 py-2 text-right font-bold text-red-600 whitespace-nowrap">
                              - {despesa.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              <button
                                onClick={() => handleToggleStatus(despesa)}
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border transition-all ${despesa.status === 'pendente'
                                    ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 cursor-pointer'
                                    : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 cursor-pointer'
                                  }`}
                                title="Clique para alterar o status"
                              >
                                {despesa.status === 'pendente' ? (
                                  <>⏳ Pendente</>
                                ) : (
                                  <>✅ Paga</>
                                )}
                              </button>
                            </td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">
                              <div className="flex justify-end gap-1">
                                {despesa.origem === 'manual' ? (
                                  isLocked ? (
                                    <span className="p-1 text-gray-300 cursor-not-allowed" title="Edição bloqueada (Data Passada)">
                                      <Lock size={14} />
                                    </span>
                                  ) : (
                                    <>
                                      <button onClick={() => handleEdit(despesa)} disabled={!isAuthorized} className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors" title="Editar"><Edit2 size={14} /></button>
                                      <button onClick={() => handleDelete(despesa.id!, despesa.origem)} disabled={!isAuthorized} className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors" title="Excluir"><Trash2 size={14} /></button>
                                    </>
                                  )
                                ) : (
                                  <span className="text-[10px] text-gray-400 italic px-2">Auto</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      <tr>
                        <td colSpan={10}>
                          <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                          />
                        </td>
                      </tr>
                    </>
                  );
                })()}
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="Data"
              type="date"
              value={formData.data}
              onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              disabled={!isAuthorized}
              required
            />
            <InputField
              label="Valor (R$)"
              type="number"
              step="0.01"
              min="0"
              value={formData.valor}
              onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
              disabled={!isAuthorized}
              required
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>

          <div className="pt-2 border-t border-gray-100">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Agendamento & Status</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <SelectField
                label="Recorrência"
                value={formData.recorrencia}
                onChange={(e) => setFormData({ ...formData, recorrencia: e.target.value as any })}
                disabled={!!editingId || !isAuthorized}
                options={[
                  { value: 'nenhuma', label: 'Não repetir' },
                  { value: 'semanal', label: 'Semanal' },
                  { value: 'quinzenal', label: 'Quinzenal' },
                  { value: 'mensal', label: 'Mensal' }
                ]}
              />

              {formData.recorrencia !== 'nenhuma' && (
                <InputField
                  label="Nº Parcelas"
                  type="number"
                  min="2"
                  max="60"
                  value={formData.frenquenciaParcelas}
                  onChange={(e) => setFormData({ ...formData, frenquenciaParcelas: parseInt(e.target.value) || 2 })}
                  disabled={!!editingId || !isAuthorized}
                  required
                />
              )}

              <SelectField
                label="Status do Pagamento"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                disabled={!isAuthorized}
                options={[
                  { value: 'paga', label: '✅ Paga / Realizada' },
                  { value: 'pendente', label: '⏳ Pendente / Agendada' }
                ]}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              className="w-full rounded-lg border-gray-300 border focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all p-3 text-sm outline-none bg-gray-50/50"
              placeholder="Ex: MATERIAL DE LIMPEZA"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value.toUpperCase() })}
              disabled={!isAuthorized}
              required
              rows={3}
            />
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
