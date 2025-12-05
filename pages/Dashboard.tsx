import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, MapPin, Plus, ArrowUpRight, ArrowDownRight, AlertTriangle } from 'lucide-react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useLocalidade } from '../contexts/LocalidadeContext';
import { db } from '../services/firebaseConfig';
import { Operador, Ponto, Rota, Venda } from '../types';

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
        limit(200)
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

  const resumo = useMemo(() => {
    const pontosLidos = new Set(vendas.map(v => v.pontoId)).size;
    const totalEntrada = vendas.reduce((acc, v) => acc + toSafeNumber(v.totalEntrada), 0);
    const totalSaida = vendas.reduce((acc, v) => acc + toSafeNumber(v.totalSaida), 0);
    const despesasOperacionais = vendas.reduce((acc, v) => acc + toSafeNumber(v.despesa), 0);
    const totalDespesas = totalSaida + despesasOperacionais;

    const lucroLiquido = vendas.reduce((acc, v) => {
      const fallback = toSafeNumber(v.totalGeral) - toSafeNumber((v as any).valorComissao) - toSafeNumber(v.despesa);
      const final = Number.isFinite((v as any).totalFinal) ? toSafeNumber((v as any).totalFinal) : fallback;
      return acc + final;
    }, 0);

    const margem = totalEntrada > 0 ? (lucroLiquido / totalEntrada) * 100 : 0;

    return { pontosLidos, totalEntrada, totalDespesas, lucroLiquido, margem };
  }, [vendas]);

  const summaryCards = [
    { label: 'PONTOS LIDOS', value: resumo.pontosLidos.toString(), sub: 'máquinas', color: 'from-violet-500 to-violet-600', text: 'text-violet-50' },
    { label: 'TOTAL BRUTO', value: formatCurrency(resumo.totalEntrada), sub: 'arrecadação', color: 'from-blue-500 to-blue-600', text: 'text-blue-50' },
    { label: 'TOTAL DESPESA', value: formatCurrency(resumo.totalDespesas), sub: 'saídas', color: 'from-rose-500 to-rose-600', text: 'text-rose-50' },
    { label: 'LUCRO LÍQUIDO', value: formatCurrency(resumo.lucroLiquido), sub: 'resultado', color: 'from-emerald-500 to-emerald-600', text: 'text-emerald-50' },
    { label: 'MARGEM', value: formatPercent(resumo.margem), sub: 'lucro real', color: 'from-amber-500 to-amber-600', text: 'text-amber-50' }
  ];

  const filteredRecentes = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = term
      ? vendas.filter(v => {
          const ponto = pontosIndex[v.pontoId]?.nome || '';
          const pontoCodigo = pontosIndex[v.pontoId]?.codigo || '';
          const rota = rotasIndex[v.rotaId]?.nome || '';
          const operador = operadoresIndex[v.operadorId]?.nome || '';
          return [ponto, pontoCodigo, rota, operador, v.data]
            .some(field => field?.toString().toLowerCase().includes(term));
        })
      : vendas;
    return base.slice(0, 20);
  }, [search, vendas, pontosIndex, rotasIndex, operadoresIndex]);

  const getOperadorNome = (id?: string) => (id && operadoresIndex[id]?.nome) || '—';
  const getPontoCodigo = (id?: string) => (id && pontosIndex[id]?.codigo) || '—';
  const getRotaNome = (id?: string) => (id && rotasIndex[id]?.nome) || '—';

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Visão Geral</h1>
          <p className="text-slate-500 text-sm">
            {selectedLocalidadeName ? `Resultados de ${selectedLocalidadeName}` : 'Acompanhe seus resultados em tempo real.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-700" disabled>
            <Calendar size={16} />
            <span>Mês atual</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-700" disabled>
            <MapPin size={16} />
            <span>{selectedLocalidadeName || 'Selecione a localidade'}</span>
          </button>
          <button className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition" disabled>
            <Plus size={16} />
            <span>Novo</span>
          </button>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {summaryCards.map((card) => (
          <div key={card.label} className={`rounded-xl p-4 shadow-sm text-white bg-gradient-to-br ${card.color}`}>
            <p className={`text-xs font-semibold uppercase tracking-wide ${card.text}/80`}>{card.label}</p>
            <h3 className="text-2xl font-bold mt-1">{card.value}</h3>
            <p className={`${card.text} text-xs mt-1 opacity-80`}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Gráficos placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-slate-500">Desempenho por Ponto (Máquina)</p>
              <p className="text-lg font-semibold text-slate-900">Total por Data</p>
            </div>
            <ArrowUpRight size={18} className="text-emerald-500" />
          </div>
          <div className="h-48 rounded-lg bg-gradient-to-b from-slate-50 to-white border border-slate-100 flex items-center justify-center text-slate-300 text-sm">
            {loading ? 'Carregando...' : 'Gráfico de linhas (em breve)'}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-slate-500">Total por Rota</p>
              <p className="text-lg font-semibold text-slate-900">Comparativo</p>
            </div>
            <ArrowDownRight size={18} className="text-amber-500" />
          </div>
          <div className="h-48 rounded-lg bg-gradient-to-b from-slate-50 to-white border border-slate-100 flex items-center justify-center text-slate-300 text-sm">
            {loading ? 'Carregando...' : 'Gráfico de barras (em breve)'}
          </div>
        </div>
      </div>

      {/* Lançamentos Recentes */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-slate-500">Acompanhe as últimas leituras</p>
            <h2 className="text-lg font-bold text-slate-900">Lançamentos Recentes</h2>
          </div>
          <input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                {['Data', 'Código', 'Nome', 'Rota', 'Entrada', 'Saída', 'Despesa'].map((h) => (
                  <th key={h} className="px-4 py-2 text-left font-semibold text-xs uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecentes.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-700">{formatDate(item.data)}</td>
                  <td className="px-4 py-2 text-slate-700 font-medium">{getPontoCodigo(item.pontoId)}</td>
                  <td className="px-4 py-2 text-slate-700">{getOperadorNome(item.operadorId)}</td>
                  <td className="px-4 py-2">
                    <span className="px-3 py-1 text-xs rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {getRotaNome(item.rotaId)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-emerald-600 font-semibold">{formatCurrency(toSafeNumber(item.totalEntrada))}</td>
                  <td className="px-4 py-2 text-amber-600 font-semibold">{formatCurrency(toSafeNumber(item.totalSaida))}</td>
                  <td className="px-4 py-2 text-rose-600 font-semibold">{formatCurrency(toSafeNumber(item.despesa))}</td>
                </tr>
              ))}
              {filteredRecentes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    {loading ? 'Carregando dados...' : 'Nenhum lançamento encontrado para esta localidade.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
