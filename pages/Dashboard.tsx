import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, MapPin, Plus, ArrowUpRight, ArrowDownRight, AlertTriangle, Search, Filter } from 'lucide-react';
import { collection, getDocs, limit, query, where, orderBy } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useLocalidade } from '../contexts/LocalidadeContext';
import { useOperacional } from '../contexts/OperacionalContext';
import { db } from '../services/firebaseConfig';
import { Operador, Ponto, Rota, Venda } from '../types';
import { GlassCard, InputField, ButtonSecondary, Badge, ButtonPrimary } from '../components/MacOSDesign';
import { formatCurrency } from '../utils/formatters';

type Indexed<T> = Record<string, T>;

type VendaDoc = Venda & { id?: string };

const toSafeNumber = (val: any) => {
  const num = Number(val ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const formatDate = (value?: string) => {
  if (!value) return '--';
  // Handle YYYY-MM-DD string simply to avoid timezone shifts
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleDateString('pt-BR');
};

const Dashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const { selectedLocalidade, selectedLocalidadeName } = useLocalidade();
  const { pontosMap: pontosIndex, rotasMap: rotasIndex, operadoresMap: operadoresIndex } = useOperacional();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vendas, setVendas] = useState<VendaDoc[]>([]);
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'hoje' | 'semana' | 'mes'>('hoje');
  const [lastLocalidade, setLastLocalidade] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedLocalidade) {
      setVendas([]);
      return;
    }
    loadDashboardData(selectedLocalidade);
  }, [selectedLocalidade, filtroTipo]);

  const fetchVendas = async (localidadeId: string) => {
    try {
      const vendasQuery = query(
        collection(db, 'vendas'),
        where('localidadeId', '==', localidadeId),
        limit(1000)
      );
      const snapshot = await getDocs(vendasQuery);
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...(doc.data() as Venda) }))
        .filter(v => (v as any).active !== false) as VendaDoc[];
    } catch (primaryError) {
      console.warn('Fallback carregando vendas:', (primaryError as any)?.message || primaryError);
      const allSnapshot = await getDocs(query(collection(db, 'vendas'), limit(300)));
      return allSnapshot.docs
        .map(doc => ({ id: doc.id, ...(doc.data() as Venda) }))
        .filter(v => v.localidadeId === localidadeId && (v as any).active !== false) as VendaDoc[];
    }
  };

  const loadDashboardData = async (localidadeId: string) => {
    setLoading(true);
    setError(null);

    try {
      const vendasData = await fetchVendas(localidadeId);

      // Filtrar vendas por período
      const hoje = new Date();
      let dataInicio = new Date(hoje);

      if (filtroTipo === 'hoje') {
        dataInicio.setHours(0, 0, 0, 0);
      } else if (filtroTipo === 'semana') {
        dataInicio.setDate(hoje.getDate() - 7);
        dataInicio.setHours(0, 0, 0, 0);
      } else if (filtroTipo === 'mes') {
        dataInicio.setDate(1);
        dataInicio.setHours(0, 0, 0, 0);
      }

      const vendasFiltradas = vendasData.filter((venda: VendaDoc) => {
        const vendaDate = venda.timestamp?.toDate ? venda.timestamp.toDate() : new Date(venda.data);
        return vendaDate >= dataInicio;
      });

      vendasFiltradas.sort((a: VendaDoc, b: VendaDoc) => new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime());
      setVendas(vendasFiltradas);
    } catch (err: any) {
      console.error('Erro ao carregar dashboard:', err);
      setError(err?.message || 'Erro ao carregar dados do dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const getPontoCodigo = (id?: string) => (id && pontosIndex[id]?.codigo) || '—';
  const getPontoNome = (id?: string) => (id && pontosIndex[id]?.nome) || '—';
  const getRotaNome = (id?: string) => (id && rotasIndex[id]?.nome) || '—';
  const getOperadorNome = (id?: string) => (id && operadoresIndex[id]?.nome) || '—';

  const resumo = useMemo(() => {
    const pontosLidos = new Set(vendas.map(v => v.pontoId)).size;
    const totalEntrada = vendas.reduce((acc, v) => acc + toSafeNumber(v.totalEntrada), 0);
    const totalSaida = vendas.reduce((acc, v) => acc + toSafeNumber(v.totalSaida), 0);

    // Total Líquido (Bruto): usar totalGeral ou liquidoDaMaquina como fallback
    const totalGeral = vendas.reduce((acc, v) => {
      const valor = v.totalGeral || (v as any).liquidoDaMaquina || 0;
      return acc + toSafeNumber(valor);
    }, 0);

    const despesasOperacionais = vendas.reduce((acc, v) => acc + toSafeNumber(v.despesa), 0);
    const totalComissoes = vendas.reduce((acc, v) => acc + toSafeNumber(v.valorComissao), 0);
    const totalDespesas = despesasOperacionais; // Apenas despesas operacionais

    const lucroLiquido = vendas.reduce((acc, v) => {
      const final = toSafeNumber(v.totalFinal);
      return acc + final;
    }, 0);

    const margem = totalGeral > 0 ? (lucroLiquido / totalGeral) * 100 : 0;

    return { pontosLidos, totalEntrada, totalGeral, totalDespesas, totalComissoes, lucroLiquido, margem };
  }, [vendas]);

  const summaryCards = [
    { label: 'PONTOS LIDOS', value: resumo.pontosLidos.toString(), icon: '📍', iconBg: 'bg-violet-50', iconText: 'text-violet-600' },
    { label: 'TOTAL LÍQUIDO', value: formatCurrency(resumo.totalGeral), icon: '💵', iconBg: 'bg-blue-50', iconText: 'text-blue-600' },
    { label: 'TOTAL DESPESA', value: formatCurrency(resumo.totalDespesas), icon: '📤', iconBg: 'bg-rose-50', iconText: 'text-rose-600' },
    { label: 'LUCRO LÍQUIDO', value: formatCurrency(resumo.lucroLiquido), icon: '✅', iconBg: 'bg-emerald-50', iconText: 'text-emerald-600' },
    { label: 'MARGEM', value: formatPercent(resumo.margem), icon: '📊', iconBg: 'bg-amber-50', iconText: 'text-amber-600' }
  ];

  // Agrupamento de Vendas por Ponto e Data para a Tabela
  const groupedVendas = useMemo(() => {
    const groups: Record<string, any> = {};

    vendas.forEach(v => {
      const dateKey = v.data; // YYYY-MM-DD
      const pontoId = v.pontoId;
      const key = `${dateKey}_${pontoId}`;

      if (!groups[key]) {
        groups[key] = {
          id: key,
          data: v.data,
          pontoId: v.pontoId,
          rotaId: v.rotaId || pontosIndex[pontoId]?.rotaId,
          totalEntrada: 0, // Valor Monetário
          totalSaida: 0, // Valor Monetário
          totalGeral: 0,
          valorComissao: 0,
          despesa: 0,
          totalFinal: 0,
          count: 0
        };
      }

      // Usar totalGeral ou liquidoDaMaquina como fallback
      const geral = toSafeNumber(v.totalGeral || (v as any).liquidoDaMaquina || 0);

      // Calcular fator implícito desta venda para converter entrada/saída em Reais
      const diff = toSafeNumber(v.totalEntrada) - toSafeNumber(v.totalSaida);
      const fator = (diff !== 0 && geral !== 0) ? geral / diff : 1;

      const entradaReais = toSafeNumber(v.totalEntrada) * fator;
      const saidaReais = toSafeNumber(v.totalSaida) * fator;

      groups[key].totalEntrada += entradaReais;
      groups[key].totalSaida += saidaReais;
      groups[key].totalGeral += geral;
      groups[key].valorComissao += toSafeNumber(v.valorComissao);
      groups[key].despesa += toSafeNumber(v.despesa);
      groups[key].totalFinal += toSafeNumber(v.totalFinal);
      groups[key].count += 1;
    });

    return Object.values(groups).sort((a, b) => {
      // 1. Data DESC
      const dateDiff = new Date(b.data).getTime() - new Date(a.data).getTime();
      if (dateDiff !== 0) return dateDiff;

      // 2. Código Ponto ASC
      const codA = getPontoCodigo(a.pontoId);
      const codB = getPontoCodigo(b.pontoId);
      if (codA < codB) return -1;
      if (codA > codB) return 1;

      // 3. Nome Ponto ASC
      const nomeA = pontosIndex[a.pontoId]?.nome || '';
      const nomeB = pontosIndex[b.pontoId]?.nome || '';
      return nomeA.localeCompare(nomeB);
    });
  }, [vendas, pontosIndex]);

  const filteredRecentes = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return groupedVendas.slice(0, 20); // Limitar a 20 lançamentos recentes

    return groupedVendas.filter(item => {
      const ponto = pontosIndex[item.pontoId]?.nome || '';
      const codigo = pontosIndex[item.pontoId]?.codigo || '';
      const rota = rotasIndex[item.rotaId]?.nome || '';
      return [ponto, codigo, rota, item.data]
        .some(field => field?.toString().toLowerCase().includes(term));
    }).slice(0, 20);
  }, [search, groupedVendas, pontosIndex, rotasIndex]);

  // Dados para Gráficos
  const chartDataPonto = useMemo(() => {
    const map: Record<string, number> = {};
    vendas.forEach(v => {
      const nome = pontosIndex[v.pontoId]?.nome || v.pontoId;
      map[nome] = (map[nome] || 0) + toSafeNumber(v.totalFinal);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [vendas, pontosIndex]);

  const chartDataRota = useMemo(() => {
    const map: Record<string, number> = {};
    vendas.forEach(v => {
      const nome = rotasIndex[v.rotaId]?.nome || 'Sem Rota';
      // Usar totalGeral ou liquidoDaMaquina como fallback
      const geral = toSafeNumber(v.totalGeral || (v as any).liquidoDaMaquina || 0);
      const diff = toSafeNumber(v.totalEntrada) - toSafeNumber(v.totalSaida);
      const fator = (diff !== 0 && geral !== 0) ? geral / diff : 1;
      const faturamento = toSafeNumber(v.totalEntrada) * fator;

      map[nome] = (map[nome] || 0) + faturamento;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [vendas, rotasIndex]);

  return (
    <div className="w-full pb-12 bg-gray-50 min-h-screen">
      {/* Header com filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Painel de Controle</h1>
          <p className="text-gray-500 text-sm mt-1">
            {selectedLocalidadeName ? `Resultados de ${selectedLocalidadeName}` : 'Acompanhe seus resultados em tempo real.'}
          </p>
        </div>
      </div>

      {/* Filtros de Período - Estilo Segmented Control */}
      <div className="flex items-center gap-4 mb-6">
        <span className="text-sm font-medium text-gray-500">Período:</span>
        <div className="bg-white p-1 rounded-xl border border-gray-200 inline-flex shadow-sm">
          {[
            { id: 'hoje', label: 'Hoje' },
            { id: 'semana', label: '7 dias' },
            { id: 'mes', label: 'Mês atual' }
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => setFiltroTipo(option.id as any)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filtroTipo === option.id
                ? 'bg-emerald-100 text-emerald-800 shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {!selectedLocalidade && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
          <AlertTriangle size={18} />
          <span>Selecione uma localidade para carregar os dados reais.</span>
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Resumo cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className={`${card.iconBg} ${card.iconText} rounded-lg p-1.5 text-base shrink-0`}>
                {card.icon}
              </div>
              <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider text-right leading-tight">
                {card.label}
              </p>
            </div>

            <div>
              <h3 className="text-gray-900 text-lg sm:text-xl font-bold tracking-tight truncate leading-none">
                {card.value}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos Compactos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        {/* Gráfico Pontos */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Desempenho por Ponto</h3>
          <div className="flex-1 min-h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataPonto} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#f3f4f6" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  interval={0}
                />
                <YAxis
                  width={40}
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  tickFormatter={(value) => `R$${value}`}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
                <Bar dataKey="value" fill="#059669" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico Rotas */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Distribuição por Rota</h3>
          <div className="flex-1 min-h-[160px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartDataRota}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {chartDataRota.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#059669', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
                <Legend
                  verticalAlign="middle"
                  align="right"
                  layout="vertical"
                  iconType="circle"
                  formatter={(value) => <span className="text-[10px] text-gray-500 font-medium ml-1 uppercase">{value}</span>}
                  wrapperStyle={{ paddingLeft: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Lançamentos Recentes */}
      <GlassCard className="p-0 overflow-hidden mt-8">
        <div className="p-6 border-b border-gray-100 bg-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Últimos Lançamentos</h2>
              <p className="text-sm text-gray-500 mt-1">Últimas 20 leituras do período selecionado</p>
            </div>

            <div className="w-full md:w-72">
              <InputField
                placeholder="Buscar lançamento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search size={18} />}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm table-responsive">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Data', 'Código', 'Nome do Ponto', 'Rota', 'Entrada', 'Saída', 'Líquido', 'Comissão', 'Despesa', 'Lucro'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 text-[10px] uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredRecentes.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-emerald-50/30 transition-colors even:bg-gray-50/30">
                  <td data-label="Data" className="px-3 py-2 text-gray-700 font-medium text-xs whitespace-nowrap">{formatDate(item.data)}</td>
                  <td data-label="Código" className="px-3 py-2 text-gray-800 font-bold text-xs font-mono">{getPontoCodigo(item.pontoId)}</td>
                  <td data-label="Nome do Ponto" className="px-3 py-2 text-gray-900 font-medium text-xs whitespace-nowrap">{getPontoNome(item.pontoId)}</td>
                  <td data-label="Rota" className="px-3 py-2">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto">
                      {getRotaNome(item.rotaId)}
                    </Badge>
                  </td>
                  <td data-label="Entrada" className="px-3 py-2 text-emerald-600 font-bold text-xs whitespace-nowrap">{formatCurrency(toSafeNumber(item.totalEntrada))}</td>
                  <td data-label="Saída" className="px-3 py-2 text-amber-600 font-bold text-xs whitespace-nowrap">{formatCurrency(toSafeNumber(item.totalSaida))}</td>
                  <td data-label="Líquido" className="px-3 py-2 text-blue-600 font-bold text-xs whitespace-nowrap">{formatCurrency(toSafeNumber(item.totalGeral))}</td>
                  <td data-label="Comissão" className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">{formatCurrency(toSafeNumber(item.valorComissao))}</td>
                  <td data-label="Despesa" className="px-3 py-2 text-rose-600 font-bold text-xs whitespace-nowrap">{formatCurrency(toSafeNumber(item.despesa))}</td>
                  <td data-label="Lucro" className="px-3 py-2 text-emerald-700 font-black text-xs whitespace-nowrap">{formatCurrency(toSafeNumber(item.totalFinal))}</td>
                </tr>
              ))}
              {filteredRecentes.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    {loading ? 'Carregando dados...' : 'Nenhum lançamento encontrado para esta localidade.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};
export default Dashboard;
