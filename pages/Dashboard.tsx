import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, MapPin, Plus, ArrowUpRight, ArrowDownRight, AlertTriangle, Search, Filter } from 'lucide-react';
import { collection, getDocs, limit, query, where, orderBy } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useLocalidade } from '../contexts/LocalidadeContext';
import { db } from '../services/firebaseConfig';
import { Operador, Ponto, Rota, Venda } from '../types';
import { GlassCard, InputField, ButtonSecondary, Badge, ButtonPrimary } from '../components/MacOSDesign';

type Indexed<T> = Record<string, T>;

type VendaDoc = Venda & { id?: string };

const toSafeNumber = (val: any) => {
  const num = Number(val ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const formatDate = (value?: string) => {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleDateString('pt-BR');
};

const Dashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const { selectedLocalidade, selectedLocalidadeName } = useLocalidade();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vendas, setVendas] = useState<VendaDoc[]>([]);
  const [pontosIndex, setPontosIndex] = useState<Indexed<Ponto>>({});
  const [rotasIndex, setRotasIndex] = useState<Indexed<Rota>>({});
  const [operadoresIndex, setOperadoresIndex] = useState<Indexed<Operador>>({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!selectedLocalidade) {
      setVendas([]);
      setPontosIndex({});
      setRotasIndex({});
      setOperadoresIndex({});
      return;
    }
    loadDashboardData(selectedLocalidade);
  }, [selectedLocalidade]);

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
      const [vendasData, pontosSnap, rotasSnap, operadoresSnap] = await Promise.all([
        fetchVendas(localidadeId),
        getDocs(query(collection(db, 'pontos'), where('active', '==', true), where('localidadeId', '==', localidadeId))),
        getDocs(query(collection(db, 'rotas'), where('active', '==', true), where('localidadeId', '==', localidadeId))),
        getDocs(query(collection(db, 'operadores'), where('active', '==', true), where('localidadeId', '==', localidadeId)))
      ]);

      vendasData.sort((a, b) => new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime());
      setVendas(vendasData);

      const pontosMap: Indexed<Ponto> = {};
      pontosSnap.docs.forEach(doc => {
        const data = doc.data() as Ponto;
        pontosMap[doc.id] = { ...data, id: doc.id };
      });
      setPontosIndex(pontosMap);

      const rotasMap: Indexed<Rota> = {};
      rotasSnap.docs.forEach(doc => {
        const data = doc.data() as Rota;
        rotasMap[doc.id] = { ...data, id: doc.id };
      });
      setRotasIndex(rotasMap);

      const operadoresMap: Indexed<Operador> = {};
      operadoresSnap.docs.forEach(doc => {
        const data = doc.data() as Operador;
        operadoresMap[doc.id] = { ...data, id: doc.id };
      });
      setOperadoresIndex(operadoresMap);
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
    const totalGeral = vendas.reduce((acc, v) => acc + toSafeNumber(v.totalGeral), 0);
    const despesasOperacionais = vendas.reduce((acc, v) => acc + toSafeNumber(v.despesa), 0);
    const totalDespesas = totalSaida + despesasOperacionais;

    const lucroLiquido = vendas.reduce((acc, v) => {
      const fallback = toSafeNumber(v.totalGeral) - toSafeNumber((v as any).valorComissao) - toSafeNumber(v.despesa);
      const final = Number.isFinite((v as any).totalFinal) ? toSafeNumber((v as any).totalFinal) : fallback;
      return acc + final;
    }, 0);

    const margem = totalGeral > 0 ? (lucroLiquido / totalGeral) * 100 : 0;

    return { pontosLidos, totalEntrada, totalGeral, totalDespesas, lucroLiquido, margem };
  }, [vendas]);

  const summaryCards = [
    { label: 'PONTOS LIDOS', value: resumo.pontosLidos.toString(), sub: 'máquinas', color: 'from-violet-500 to-violet-600', text: 'text-violet-50' },
    { label: 'TOTAL LÍQUIDO', value: formatCurrency(resumo.totalGeral), sub: 'entrada - saída', color: 'from-blue-500 to-blue-600', text: 'text-blue-50' },
    { label: 'TOTAL DESPESA', value: formatCurrency(resumo.totalDespesas), sub: 'saídas', color: 'from-rose-500 to-rose-600', text: 'text-rose-50' },
    { label: 'LUCRO LÍQUIDO', value: formatCurrency(resumo.lucroLiquido), sub: 'resultado', color: 'from-emerald-500 to-emerald-600', text: 'text-emerald-50' },
    { label: 'MARGEM', value: formatPercent(resumo.margem), sub: 'lucro real', color: 'from-amber-500 to-amber-600', text: 'text-amber-50' }
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

      // Calcular fator implícito desta venda para converter entrada/saída em Reais
      const diff = toSafeNumber(v.totalEntrada) - toSafeNumber(v.totalSaida);
      const geral = toSafeNumber(v.totalGeral);
      const fator = diff !== 0 ? geral / diff : 0;

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
    if (!term) return groupedVendas.slice(0, 50);

    return groupedVendas.filter(item => {
      const ponto = pontosIndex[item.pontoId]?.nome || '';
      const codigo = pontosIndex[item.pontoId]?.codigo || '';
      const rota = rotasIndex[item.rotaId]?.nome || '';
      return [ponto, codigo, rota, item.data]
        .some(field => field?.toString().toLowerCase().includes(term));
    });
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
      // Tentativa de estimar Faturamento (Reais)
      const diff = toSafeNumber(v.totalEntrada) - toSafeNumber(v.totalSaida);
      const geral = toSafeNumber(v.totalGeral);
      const fator = diff !== 0 ? geral / diff : 0;
      const faturamento = toSafeNumber(v.totalEntrada) * fator;

      map[nome] = (map[nome] || 0) + faturamento;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [vendas, rotasIndex]);

  return (
    <div className="w-full pb-12">
      {/* Header filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Visão Geral</h1>
          <p className="text-slate-500 text-sm">
            {selectedLocalidadeName ? `Resultados de ${selectedLocalidadeName}` : 'Acompanhe seus resultados em tempo real.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Chips de Filtro */}
          <ButtonSecondary disabled icon={<Calendar size={16} />}>
            Mês atual
          </ButtonSecondary>

          <ButtonSecondary disabled icon={<MapPin size={16} />}>
            {selectedLocalidadeName || 'Selecione a localidade'}
          </ButtonSecondary>

          <ButtonPrimary className="px-5 py-2 flex items-center gap-2" disabled>
            <Plus size={18} />
            <span>Novo Lançamento</span>
          </ButtonPrimary>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 mb-6">
        {summaryCards.map((card) => (
          <div key={card.label} className={`rounded-xl p-4 shadow-sm text-white bg-gradient-to-br ${card.color}`}>
            <p className={`text-xs font-semibold uppercase tracking-wide ${card.text}/80`}>{card.label}</p>
            <h3 className="text-2xl font-bold mt-1">{card.value}</h3>
            <p className={`${card.text} text-xs mt-1 opacity-80`}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-slate-500">Top 10 Pontos (Lucro)</p>
              <p className="text-lg font-semibold text-slate-900">Desempenho por Ponto</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataPonto} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-slate-500">Faturamento por Rota</p>
              <p className="text-lg font-semibold text-slate-900">Total por Rota</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataRota} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis hide />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Lançamentos Recentes */}
      <GlassCard className="p-0 overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-100 bg-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Lançamentos Recentes</h2>
              <p className="text-sm text-slate-500 mt-1">Acompanhe as últimas leituras realizadas</p>
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
          <table className="w-full text-sm">
            <thead className="bg-[#f0f2f5] border-b border-slate-200">
              <tr>
                {['Data', 'Código', 'Nome do Ponto', 'Rota', 'Entrada', 'Saída', 'Líquido', 'Comissão', 'Despesa', 'Lucro'].map((h) => (
                  <th key={h} className="px-2 py-1 text-left font-semibold text-slate-600 text-[10px] uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredRecentes.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-2 py-1 text-slate-700 font-medium text-xs whitespace-nowrap">{formatDate(item.data)}</td>
                  <td className="px-2 py-1 text-slate-800 font-bold text-xs font-mono">{getPontoCodigo(item.pontoId)}</td>
                  <td className="px-2 py-1 text-slate-900 font-medium text-xs whitespace-nowrap">{getPontoNome(item.pontoId)}</td>
                  <td className="px-2 py-1">
                    <Badge variant="secondary" className="text-[10px] px-1 py-0.5 h-auto">
                      {getRotaNome(item.rotaId)}
                    </Badge>
                  </td>
                  <td className="px-2 py-1 text-emerald-600 font-bold text-xs whitespace-nowrap">{formatCurrency(toSafeNumber(item.totalEntrada))}</td>
                  <td className="px-2 py-1 text-amber-600 font-bold text-xs whitespace-nowrap">{formatCurrency(toSafeNumber(item.totalSaida))}</td>
                  <td className="px-2 py-1 text-blue-600 font-bold text-xs whitespace-nowrap">{formatCurrency(toSafeNumber(item.totalGeral))}</td>
                  <td className="px-2 py-1 text-slate-500 text-xs whitespace-nowrap">{formatCurrency(toSafeNumber(item.valorComissao))}</td>
                  <td className="px-2 py-1 text-rose-600 font-bold text-xs whitespace-nowrap">{formatCurrency(toSafeNumber(item.despesa))}</td>
                  <td className="px-2 py-1 text-emerald-700 font-black text-xs whitespace-nowrap">{formatCurrency(toSafeNumber(item.totalFinal))}</td>
                </tr>
              ))}
              {filteredRecentes.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-500">
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
