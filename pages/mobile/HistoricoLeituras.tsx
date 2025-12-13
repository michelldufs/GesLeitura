import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { Venda } from '../../types';
import { Calendar, Camera, Loader2, CheckCircle, Clock, TrendingUp, DollarSign, Package } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const HistoricoLeituras: React.FC = () => {
  const { userProfile } = useAuth();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [pontos, setPontos] = useState<any[]>([]);
  const [operadores, setOperadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroData, setFiltroData] = useState<'hoje' | 'ontem' | 'semana' | 'periodo'>('hoje');
  const [fotoModal, setFotoModal] = useState<string | null>(null);
  const [showPeriodoModal, setShowPeriodoModal] = useState(false);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Carregar pontos e operadores uma vez
  useEffect(() => {
    const loadData = async () => {
      if (!userProfile?.allowedLocalidades?.[0]) return;
      try {
        const localidadeId = userProfile.allowedLocalidades[0];

        // Carregar pontos
        const pontosSnap = await getDocs(
          query(collection(db, 'pontos'), where('localidadeId', '==', localidadeId))
        );
        setPontos(pontosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Carregar operadores
        const operadoresSnap = await getDocs(
          query(collection(db, 'operadores'), where('localidadeId', '==', localidadeId))
        );
        setOperadores(operadoresSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };
    loadData();
  }, [userProfile]);

  // Função para buscar nome do ponto
  const getNomePonto = (pontoId: string) => {
    const ponto = pontos.find(p => p.id === pontoId);
    return ponto?.nome || pontoId;
  };

  // Função para buscar nome do operador
  const getNomeOperador = (operadorId: string) => {
    const operador = operadores.find(op => op.id === operadorId);
    return operador?.nome || operadorId;
  };

  // Agrupar vendas por Ponto apenas (todas leituras do mesmo ponto juntas)
  const vendasAgrupadas = React.useMemo(() => {
    const grupos: { [key: string]: { pontoId: string; pontoNome: string; timestamp: any; vendas: Venda[]; total: number } } = {};

    vendas.forEach(venda => {
      const vendaDate = venda.timestamp?.toDate();
      if (!vendaDate) return;

      // Chave única: apenas pontoId (agrupa TODAS as leituras do mesmo ponto)
      const key = venda.pontoId || 'N/A';

      if (!grupos[key]) {
        grupos[key] = {
          pontoId: venda.pontoId || 'N/A',
          pontoNome: getNomePonto(venda.pontoId || ''),
          timestamp: venda.timestamp, // Usa timestamp da primeira venda
          vendas: [],
          total: 0
        };
      }

      grupos[key].vendas.push(venda);
      grupos[key].total += (venda.totalFinal || 0);

      // Atualiza para o timestamp mais recente
      if (vendaDate > (grupos[key].timestamp?.toDate() || new Date(0))) {
        grupos[key].timestamp = venda.timestamp;
      }
    });

    return Object.entries(grupos)
      .map(([key, grupo]) => ({ key, ...grupo }))
      .sort((a, b) => {
        const dateA = a.timestamp?.toDate() || new Date(0);
        const dateB = b.timestamp?.toDate() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
  }, [vendas, pontos, operadores]);

  useEffect(() => {
    loadVendas();
  }, [filtroData, userProfile, dataInicio, dataFim]);

  const loadVendas = async () => {
    if (!userProfile?.uid) return;

    setLoading(true);
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      let dataInicioQuery: Date;
      let dataFimQuery: Date;

      switch (filtroData) {
        case 'hoje':
          dataInicioQuery = hoje;
          dataFimQuery = new Date();
          dataFimQuery.setHours(23, 59, 59, 999);
          break;
        case 'ontem':
          dataInicioQuery = new Date(hoje);
          dataInicioQuery.setDate(dataInicioQuery.getDate() - 1);
          dataFimQuery = new Date(hoje);
          dataFimQuery.setSeconds(dataFimQuery.getSeconds() - 1);
          break;
        case 'semana':
          dataInicioQuery = new Date(hoje);
          dataInicioQuery.setDate(dataInicioQuery.getDate() - 7);
          dataFimQuery = new Date();
          dataFimQuery.setHours(23, 59, 59, 999);
          break;
        case 'periodo':
          if (!dataInicio || !dataFim) return;
          dataInicioQuery = new Date(dataInicio);
          dataInicioQuery.setHours(0, 0, 0, 0);
          dataFimQuery = new Date(dataFim);
          dataFimQuery.setHours(23, 59, 59, 999);
          break;
        default:
          dataInicioQuery = hoje;
          dataFimQuery = new Date();
          dataFimQuery.setHours(23, 59, 59, 999);
      }

      console.log('🔍 Carregando vendas para:', userProfile.uid);
      console.log('📅 Período:', { dataInicioQuery, dataFimQuery });

      const q = query(
        collection(db, 'vendas'),
        where('coletorId', '==', userProfile.uid),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      console.log('📦 Total documentos:', snapshot.docs.length);

      // Filtrar no cliente por data
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Venda))
        .filter(venda => {
          const vendaDate = venda.timestamp?.toDate();
          if (!vendaDate) return false;
          return vendaDate >= dataInicioQuery && vendaDate <= dataFimQuery;
        });
      console.log(`✅ ${data.length} vendas encontradas no período`);
      setVendas(data);
    } catch (error) {
      console.error('❌ Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatData = (timestamp: any) => {
    if (!timestamp) return 'Data inválida';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'conferido':
        return 'bg-green-100 text-green-700';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-700';
      case 'rejeitado':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'conferido':
        return <CheckCircle size={16} />;
      case 'pendente':
        return <Clock size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  // Calcular totalizadores
  const totalizadores = React.useMemo(() => {
    let totalMaquinas = 0;
    let totalBruto = 0; // Soma de entrada - saída (totalGeral)
    let despesasTotal = 0;
    let comissoesTotal = 0;
    let lucroFinalTotal = 0; // Soma dos totalFinal

    vendas.forEach(venda => {
      totalMaquinas++;

      // Total bruto = totalGeral (ou liquidoDaMaquina para vendas antigas que não tinham esse campo)
      const totalGeralVenda = venda.totalGeral || (venda as any).liquidoDaMaquina || 0;
      totalBruto += totalGeralVenda;

      // Debug
      if (totalMaquinas <= 3) {
        console.log(`Venda ${totalMaquinas}:`, {
          totalGeral: venda.totalGeral,
          liquidoDaMaquina: (venda as any).liquidoDaMaquina,
          totalEntrada: venda.totalEntrada,
          totalSaida: venda.totalSaida,
          totalFinal: venda.totalFinal,
          usado: totalGeralVenda
        });
      }

      // Comissões
      comissoesTotal += (venda.valorComissao || 0);

      // Despesas (apenas de pontos que participam)
      despesasTotal += (venda.despesa || 0);

      // Lucro final (valor líquido para empresa)
      lucroFinalTotal += (venda.totalFinal || 0);
    });

    console.log('Totalizadores:', { totalMaquinas, totalBruto, despesasTotal, comissoesTotal, lucroFinalTotal });

    return {
      totalMaquinas,
      totalBruto,
      despesasTotal,
      comissoesTotal,
      lucroFinal: lucroFinalTotal
    };
  }, [vendas]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
          <p className="text-gray-600 font-medium">Carregando histórico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-sm p-4 sticky top-0 z-10 border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Calendar size={20} className="text-emerald-600" />
          Histórico de Leituras
        </h2>

        <div className="flex gap-2">
          <button
            onClick={() => setFiltroData('hoje')}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition-all ${filtroData === 'hoje'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            Hoje
          </button>
          <button
            onClick={() => setFiltroData('ontem')}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition-all ${filtroData === 'ontem'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            Ontem
          </button>
          <button
            onClick={() => setFiltroData('semana')}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition-all ${filtroData === 'semana'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            7 dias
          </button>
          <button
            onClick={() => setShowPeriodoModal(true)}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition-all ${filtroData === 'periodo'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            Período
          </button>
        </div>
      </div>

      {/* Card de Totalizadores - Minimalista */}
      {vendas.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Resumo do Período</h3>
            <span className="text-xs text-gray-500">{totalizadores.totalMaquinas} máq.</span>
          </div>

          {/* Grid compacto 3 colunas */}
          <div className="grid grid-cols-3 gap-2 mb-2 text-center">
            {/* Despesas */}
            <div className="bg-orange-50 rounded-xl p-2 border border-orange-100">
              <p className="text-[10px] text-orange-600 font-medium mb-0.5">Despesas</p>
              <p className="text-sm font-bold text-orange-700">
                R$ {formatCurrency(totalizadores.despesasTotal)}
              </p>
            </div>

            {/* Comissões */}
            <div className="bg-purple-50 rounded-xl p-2 border border-purple-100">
              <p className="text-[10px] text-purple-600 font-medium mb-0.5">Comissões</p>
              <p className="text-sm font-bold text-purple-700">
                R$ {formatCurrency(totalizadores.comissoesTotal)}
              </p>
            </div>

            {/* Total Bruto */}
            <div className="bg-blue-50 rounded-xl p-2 border border-blue-100">
              <p className="text-[10px] text-blue-600 font-medium mb-0.5">Bruto</p>
              <p className="text-sm font-bold text-blue-700">
                R$ {formatCurrency(totalizadores.totalBruto)}
              </p>
            </div>
          </div>

          {/* Lucro Líquido - Destaque */}
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-2.5 flex items-center justify-between shadow-md">
            <div>
              <p className="text-[10px] text-emerald-50 font-medium">Lucro Líquido</p>
              <p className="text-xl font-bold text-white">
                R$ {formatCurrency(totalizadores.lucroFinal)}
              </p>
            </div>
            <TrendingUp size={24} className="text-emerald-100 opacity-60" />
          </div>
        </div>
      )}

      {/* Lista de Vendas Agrupadas por Ponto */}
      {vendasAgrupadas.length === 0 ? (
        <div className="text-center py-12">
          <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">Nenhuma leitura encontrada</p>
          <p className="text-gray-400 text-sm">Tente outro período ou faça uma nova leitura</p>
        </div>
      ) : (
        <div className="space-y-2">
          {vendasAgrupadas.map((grupo) => {
            const isExpanded = expandedId === grupo.key;
            return (
              <div
                key={grupo.key}
                className="bg-white border border-slate-100 rounded-2xl shadow-lg shadow-slate-200/50 overflow-hidden"
              >
                {/* Card do Ponto - Clicável */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : grupo.key)}
                  className="p-3 cursor-pointer active:bg-slate-50"
                >
                  {/* Linha 1: Data/Hora + Total do Ponto */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-500 font-medium">
                      {formatData(grupo.timestamp)}
                    </span>
                    <span className="text-lg font-bold text-emerald-600">
                      R$ {formatCurrency(grupo.total)}
                    </span>
                  </div>

                  {/* Linha 2: Nome do Ponto + Quantidade + Seta */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">{grupo.pontoNome}</span>
                      <span className="text-xs bg-[#e7fce3] text-[#008069] px-2 py-0.5 rounded-full font-bold">
                        {grupo.vendas.length}
                      </span>
                    </div>
                    <span className="text-slate-400 text-sm">
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {/* Lista de Operadores Expandida */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/30">
                    {grupo.vendas.map((venda, index) => (
                      <div
                        key={venda.id || index}
                        className="px-3 py-2 border-b border-slate-100 last:border-b-0"
                      >
                        {/* Operador + Valor */}
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-slate-800 truncate max-w-[200px]">
                            {getNomeOperador(venda.operadorId || '')}
                          </span>
                          <span className="text-sm font-bold text-emerald-600">
                            R$ {formatCurrency(venda.totalFinal)}
                          </span>
                        </div>

                        {/* Detalhes Financeiros */}
                        <div className="text-xs text-slate-500 space-y-0.5">
                          <div className="flex justify-between">
                            <span>Entrada: R$ {formatCurrency(venda.totalEntrada)}</span>
                            <span>Saída: R$ {formatCurrency(venda.totalSaida)}</span>
                          </div>
                          {((venda as any).despesa > 0 || (venda as any).valorComissao > 0) && (
                            <div className="flex justify-between text-orange-600">
                              {(venda as any).despesa > 0 && (
                                <span>Desp: -R$ {formatCurrency((venda as any).despesa)}</span>
                              )}
                              {(venda as any).valorComissao > 0 && (
                                <span>Com: -R$ {formatCurrency((venda as any).valorComissao)}</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Status + Foto */}
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className={`text-xs px-2 py-0.5 rounded font-semibold ${getStatusColor(venda.status_conferencia || 'pendente')}`}>
                            {venda.status_conferencia === 'conferido' ? '✓' : '⏱'}
                          </span>

                          {venda.fotoUrl && venda.fotoUrl !== 'foto_pendente' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setFotoModal(venda.fotoUrl!);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                            >
                              <Camera size={12} />
                              Foto
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Foto */}
      {fotoModal && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setFotoModal(null)}
        >
          <div className="relative max-w-full max-h-full">
            <img
              src={fotoModal}
              alt="Foto da leitura"
              className="max-w-full max-h-[90vh] rounded-lg"
            />
            <button
              onClick={() => setFotoModal(null)}
              className="absolute top-4 right-4 bg-white text-slate-900 rounded-full p-2 shadow-lg hover:bg-slate-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Modal de Período */}
      {showPeriodoModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPeriodoModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Calendar size={20} className="text-blue-600" />
              Selecionar Período
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Data Início
                </label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Data Fim
                </label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPeriodoModal(false)}
                className="flex-1 py-3 px-6 bg-white border border-slate-200 text-slate-600 rounded-full font-bold hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (dataInicio && dataFim) {
                    setFiltroData('periodo');
                    setShowPeriodoModal(false);
                  }
                }}
                disabled={!dataInicio || !dataFim}
                className="flex-1 py-3 px-6 bg-[#008069] hover:bg-[#006d59] active:bg-[#005c4b] disabled:bg-slate-300 text-white rounded-full font-bold shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-70"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoricoLeituras;
