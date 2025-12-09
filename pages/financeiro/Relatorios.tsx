import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalidade } from '../../contexts/LocalidadeContext';
import { Venda } from '../../types';
import { FileText, Printer, Calendar, TrendingUp, DollarSign, Package, Filter } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type FiltroTipo = 'hoje' | 'ontem' | 'semana' | 'mes' | 'periodo';
type VisualizacaoTipo = 'resumo' | 'data' | 'ponto' | 'operador';

const Relatorios: React.FC = () => {
  const { userProfile } = useAuth();
  const { selectedLocalidade } = useLocalidade();

  // Estados
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [pontos, setPontos] = useState<any[]>([]);
  const [operadores, setOperadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('hoje');
  const [visualizacao, setVisualizacao] = useState<VisualizacaoTipo>('resumo');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [pontoFiltro, setPontoFiltro] = useState('');
  const [operadorFiltro, setOperadorFiltro] = useState('');
  const [showPeriodoModal, setShowPeriodoModal] = useState(false);

  // Carregar dados auxiliares
  useEffect(() => {
    const loadData = async () => {
      if (!selectedLocalidade) return;
      try {
        // Carregar pontos
        const pontosSnap = await getDocs(
          query(collection(db, 'pontos'), where('localidadeId', '==', selectedLocalidade))
        );
        setPontos(pontosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Carregar operadores
        const operadoresSnap = await getDocs(
          query(collection(db, 'operadores'), where('localidadeId', '==', selectedLocalidade))
        );
        setOperadores(operadoresSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };
    loadData();
  }, [selectedLocalidade]);

  // Carregar vendas com filtro de data
  useEffect(() => {
    loadVendas();
  }, [filtroTipo, selectedLocalidade, dataInicio, dataFim]);

  const loadVendas = async () => {
    console.log(`🔄 loadVendas CHAMADO - filtroTipo: "${filtroTipo}", dataInicio: "${dataInicio}", dataFim: "${dataFim}"`);

    if (!selectedLocalidade) return;

    setLoading(true);
    try {
      const hoje = new Date();
      let dataInicioQuery = new Date(hoje);
      let dataFimQuery = new Date(hoje);

      // Definir período baseado no filtro
      if (filtroTipo === 'hoje') {
        dataInicioQuery.setHours(0, 0, 0, 0);
        dataFimQuery.setHours(23, 59, 59, 999);
      } else if (filtroTipo === 'ontem') {
        dataInicioQuery.setDate(hoje.getDate() - 1);
        dataInicioQuery.setHours(0, 0, 0, 0);
        dataFimQuery.setDate(hoje.getDate() - 1);
        dataFimQuery.setHours(23, 59, 59, 999);
      } else if (filtroTipo === 'semana') {
        dataInicioQuery.setDate(hoje.getDate() - 7);
        dataInicioQuery.setHours(0, 0, 0, 0);
        dataFimQuery.setHours(23, 59, 59, 999);
      } else if (filtroTipo === 'mes') {
        dataInicioQuery.setDate(1);
        dataInicioQuery.setHours(0, 0, 0, 0);
        dataFimQuery.setHours(23, 59, 59, 999);
      } else if (filtroTipo === 'periodo' && dataInicio && dataFim) {
        console.log('🔍 Filtro Período - INPUT:', { dataInicio, dataFim, tipo: filtroTipo });

        dataInicioQuery = new Date(dataInicio + 'T00:00:00');
        dataFimQuery = new Date(dataFim + 'T23:59:59');
      } else if (filtroTipo === 'periodo') {
        console.log('⚠️ Filtro período sem datas!', { dataInicio, dataFim });
        // Se não tem datas, usar hoje
        dataInicioQuery.setHours(0, 0, 0, 0);
        dataFimQuery.setHours(23, 59, 59, 999);
      }

      const q = query(
        collection(db, 'vendas'),
        where('localidadeId', '==', selectedLocalidade)
      );

      const snapshot = await getDocs(q);

      // Filtrar no cliente
      let data: Venda[];

      if (filtroTipo === 'periodo' && dataInicio && dataFim) {
        // Filtro de período: usar campo 'data' (YYYY-MM-DD)
        data = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Venda))
          .filter(venda => {
            if (!venda.data) return false;
            const vendaDate = venda.data.trim();
            return vendaDate >= dataInicio && vendaDate <= dataFim;
          });
      } else {
        // Outros filtros: usar timestamp
        data = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Venda))
          .filter(venda => {
            const vendaDate = venda.timestamp?.toDate();
            if (!vendaDate) return false;
            return vendaDate >= dataInicioQuery && vendaDate <= dataFimQuery;
          });
      }

      const timestamp = new Date().toISOString();
      console.clear();
      console.log(`\n🔄 [${timestamp}] FILTRO APLICADO: ${filtroTipo}`);
      console.log('✅ Vendas filtradas:', data.length, 'registros');
      console.log('📋 Datas no array:', data.map(v => v.data));
      setVendas(data);
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar vendas por ponto/operador
  const vendasFiltradas = useMemo(() => {
    let result = [...vendas];
    if (pontoFiltro) {
      result = result.filter(v => v.pontoId === pontoFiltro);
    }
    if (operadorFiltro) {
      result = result.filter(v => v.operadorId === operadorFiltro);
    }
    return result;
  }, [vendas, pontoFiltro, operadorFiltro]);

  // Calcular totalizadores
  const totalizadores = useMemo(() => {
    let totalMaquinas = vendasFiltradas.length;
    let totalBruto = 0;
    let totalEntradas = 0;
    let totalSaidas = 0;
    let totalComissoes = 0;
    let totalDespesas = 0;
    let totalLiquido = 0;

    vendasFiltradas.forEach(venda => {
      totalBruto += venda.totalGeral || (venda as any).liquidoDaMaquina || 0;
      totalEntradas += venda.totalEntrada || 0;
      totalSaidas += venda.totalSaida || 0;
      totalComissoes += venda.valorComissao || 0;
      totalDespesas += venda.despesa || 0;
      totalLiquido += venda.totalFinal || 0;
    });

    return {
      totalMaquinas,
      totalBruto,
      totalEntradas,
      totalSaidas,
      totalComissoes,
      totalDespesas,
      totalLiquido
    };
  }, [vendasFiltradas]);

  // Agrupar por data
  const vendasPorData = useMemo(() => {
    const grupos: { [key: string]: Venda[] } = {};
    vendasFiltradas.forEach(venda => {
      const data = venda.data || 'Sem data';
      if (!grupos[data]) grupos[data] = [];
      grupos[data].push(venda);
    });
    const result = Object.entries(grupos).sort((a, b) => b[0].localeCompare(a[0]));
    console.log('📊 Vendas por data agrupadas:', result.map(([data, vendas]) => `${data}: ${vendas.length}`));
    return result;
  }, [vendasFiltradas]);

  // Agrupar por ponto
  const vendasPorPonto = useMemo(() => {
    const grupos: { [key: string]: Venda[] } = {};
    vendasFiltradas.forEach(venda => {
      const pontoId = venda.pontoId;
      if (!grupos[pontoId]) grupos[pontoId] = [];
      grupos[pontoId].push(venda);
    });
    return Object.entries(grupos);
  }, [vendasFiltradas]);

  // Agrupar por operador
  const vendasPorOperador = useMemo(() => {
    const grupos: { [key: string]: Venda[] } = {};
    vendasFiltradas.forEach(venda => {
      const operadorId = venda.operadorId;
      if (!grupos[operadorId]) grupos[operadorId] = [];
      grupos[operadorId].push(venda);
    });
    return Object.entries(grupos);
  }, [vendasFiltradas]);

  // Função para gerar PDF
  const gerarPDF = () => {
    const doc = new jsPDF();

    // Cabeçalho
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Vendas', 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${getPeriodoTexto()}`, 14, 28);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 14, 34);

    // Resumo
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo', 14, 44);

    const resumoData = [
      ['Total de Leituras', totalizadores.totalMaquinas.toString()],
      ['Total Bruto', `R$ ${totalizadores.totalBruto.toFixed(2)}`],
      ['Total Comissões', `R$ ${totalizadores.totalComissoes.toFixed(2)}`],
      ['Total Despesas', `R$ ${totalizadores.totalDespesas.toFixed(2)}`],
      ['Total Líquido', `R$ ${totalizadores.totalLiquido.toFixed(2)}`]
    ];

    autoTable(doc, {
      startY: 48,
      head: [['Métrica', 'Valor']],
      body: resumoData,
      theme: 'plain',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    // Detalhamento
    const finalY = (doc as any).lastAutoTable.finalY || 80;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalhamento', 14, finalY + 10);

    const detalhesData = vendasFiltradas.map(venda => {
      const ponto = pontos.find(p => p.id === venda.pontoId);
      const operador = operadores.find(o => o.id === venda.operadorId);
      return [
        venda.data || 'N/A',
        ponto?.nome || 'N/A',
        operador?.nome || 'N/A',
        `R$ ${(venda.totalEntrada || 0).toFixed(2)}`,
        `R$ ${(venda.totalSaida || 0).toFixed(2)}`,
        `R$ ${(venda.totalGeral || (venda as any).liquidoDaMaquina || 0).toFixed(2)}`,
        `R$ ${(venda.valorComissao || 0).toFixed(2)}`,
        `R$ ${(venda.totalFinal || 0).toFixed(2)}`
      ];
    });

    autoTable(doc, {
      startY: finalY + 14,
      head: [['Data', 'Ponto', 'Operador', 'Entrada', 'Saída', 'Bruto', 'Comissão', 'Líquido']],
      body: detalhesData,
      theme: 'striped',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' }
      }
    });

    // Salvar PDF
    const filename = `relatorio_${filtroTipo}_${new Date().getTime()}.pdf`;
    doc.save(filename);
  };

  const getPeriodoTexto = () => {
    if (filtroTipo === 'hoje') return 'Hoje';
    if (filtroTipo === 'ontem') return 'Ontem';
    if (filtroTipo === 'semana') return 'Últimos 7 dias';
    if (filtroTipo === 'mes') return 'Mês atual';
    if (filtroTipo === 'periodo') return `${dataInicio} até ${dataFim}`;
    return 'Período';
  };

  const getNomePonto = (pontoId: string) => {
    const ponto = pontos.find(p => p.id === pontoId);
    return ponto?.nome || pontoId;
  };

  const getNomeOperador = (operadorId: string) => {
    const operador = operadores.find(o => o.id === operadorId);
    return operador?.nome || operadorId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FileText size={32} className="text-blue-600" />
              Relatórios
            </h1>
            <p className="text-gray-600 mt-1">Análise detalhada de vendas e operações</p>
          </div>
          <button
            onClick={gerarPDF}
            className="p-2.5 bg-white text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl shadow-sm border border-gray-200 transition-all hover:border-blue-200 group"
            title="Exportar Relatório PDF"
          >
            <Printer size={22} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={18} className="text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-600">Filtros</h3>
          </div>

          {/* Período */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setFiltroTipo('hoje')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filtroTipo === 'hoje'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setFiltroTipo('ontem')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filtroTipo === 'ontem'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              Ontem
            </button>
            <button
              onClick={() => setFiltroTipo('semana')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filtroTipo === 'semana'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              7 dias
            </button>
            <button
              onClick={() => setFiltroTipo('mes')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filtroTipo === 'mes'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              Mês atual
            </button>
            <button
              onClick={() => {
                setShowPeriodoModal(true);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filtroTipo === 'periodo'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              Período
            </button>
          </div>

          {/* Filtros adicionais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Filtrar por Ponto</label>
              <select
                value={pontoFiltro}
                onChange={e => setPontoFiltro(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Todos os pontos</option>
                {pontos.map(ponto => (
                  <option key={ponto.id} value={ponto.id}>{ponto.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Filtrar por Operador</label>
              <select
                value={operadorFiltro}
                onChange={e => setOperadorFiltro(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Todos os operadores</option>
                {operadores.map(op => (
                  <option key={op.id} value={op.id}>{op.nome}</option>
                ))}
              </select>
            </div>
          </div>
        </div>



        {/* Abas de Visualização */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setVisualizacao('resumo')}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${visualizacao === 'resumo'
                ? 'bg-emerald-50 text-emerald-600 border-b-2 border-emerald-600'
                : 'text-gray-600 hover:bg-slate-50'
                }`}
            >
              Resumo
            </button>
            <button
              onClick={() => setVisualizacao('data')}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${visualizacao === 'data'
                ? 'bg-emerald-50 text-emerald-600 border-b-2 border-emerald-600'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              Por Data
            </button>
            <button
              onClick={() => setVisualizacao('ponto')}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${visualizacao === 'ponto'
                ? 'bg-emerald-50 text-emerald-600 border-b-2 border-emerald-600'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              Por Ponto
            </button>
            <button
              onClick={() => setVisualizacao('operador')}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${visualizacao === 'operador'
                ? 'bg-emerald-50 text-emerald-600 border-b-2 border-emerald-600'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              Por Operador
            </button>
          </div>

          <div className="p-6">
            {/* Visualização: Resumo */}
            {visualizacao === 'resumo' && (
              <div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {/* Card Leituras */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="bg-violet-50 text-violet-600 rounded-lg p-1.5 text-base shrink-0">
                        <Package size={18} />
                      </div>
                      <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider text-right leading-tight">
                        Leituras
                      </p>
                    </div>
                    <div>
                      <h3 className="text-gray-900 text-lg sm:text-xl font-bold tracking-tight truncate leading-none">
                        {totalizadores.totalMaquinas}
                      </h3>
                    </div>
                  </div>

                  {/* Card Bruto */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="bg-emerald-50 text-emerald-600 rounded-lg p-1.5 text-base shrink-0">
                        <TrendingUp size={18} />
                      </div>
                      <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider text-right leading-tight">
                        Total Bruto
                      </p>
                    </div>
                    <div>
                      <h3 className="text-gray-900 text-lg sm:text-xl font-bold tracking-tight truncate leading-none">
                        R$ {totalizadores.totalBruto.toFixed(2)}
                      </h3>
                    </div>
                  </div>

                  {/* Card Comissões */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="bg-orange-50 text-orange-600 rounded-lg p-1.5 text-base shrink-0">
                        <DollarSign size={18} />
                      </div>
                      <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider text-right leading-tight">
                        Comissões
                      </p>
                    </div>
                    <div>
                      <h3 className="text-gray-900 text-lg sm:text-xl font-bold tracking-tight truncate leading-none">
                        R$ {totalizadores.totalComissoes.toFixed(2)}
                      </h3>
                    </div>
                  </div>

                  {/* Card Líquido */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="bg-blue-50 text-blue-600 rounded-lg p-1.5 text-base shrink-0">
                        <TrendingUp size={18} />
                      </div>
                      <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider text-right leading-tight">
                        Líquido
                      </p>
                    </div>
                    <div>
                      <h3 className="text-gray-900 text-lg sm:text-xl font-bold tracking-tight truncate leading-none">
                        R$ {totalizadores.totalLiquido.toFixed(2)}
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Detalhamento Financeiro</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Bruto</span>
                      <span className="font-semibold text-emerald-600">R$ {totalizadores.totalBruto.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Comissões</span>
                      <span className="font-semibold text-orange-600">- R$ {totalizadores.totalComissoes.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Despesas</span>
                      <span className="font-semibold text-rose-600">- R$ {totalizadores.totalDespesas.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex justify-between font-bold">
                        <span className="text-gray-900">Total Líquido Final</span>
                        <span className="text-emerald-600 text-lg">R$ {totalizadores.totalLiquido.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Visualização: Por Data */}
            {visualizacao === 'data' && (
              <div className="space-y-3">
                {vendasPorData.map(([data, vendas]) => {
                  console.log(`🎨 Renderizando card: ${data} com ${vendas.length} vendas`);
                  const totalBruto = vendas.reduce((acc, v) => acc + (v.totalGeral || (v as any).liquidoDaMaquina || 0), 0);
                  const totalComissoes = vendas.reduce((acc, v) => acc + (v.valorComissao || 0), 0);
                  const totalDespesas = vendas.reduce((acc, v) => acc + (v.despesa || 0), 0);
                  const totalLiquido = vendas.reduce((acc, v) => acc + (v.totalFinal || 0), 0);
                  // Formatar data sem conversão UTC
                  const [ano, mes, dia] = data.split('-');
                  const dataFormatada = `${dia}/${mes}/${ano}`;

                  return (
                    <div key={`${filtroTipo}-${data}-${vendas.length}`} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold text-gray-900">{dataFormatada}</h4>
                        <span className="text-xs text-gray-500">{vendas.length} leitura{vendas.length > 1 ? 's' : ''}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Bruto</span>
                          <span className="font-semibold text-emerald-600">R$ {totalBruto.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Comissões</span>
                          <span className="font-semibold text-orange-600">- R$ {totalComissoes.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Despesas</span>
                          <span className="font-semibold text-rose-600">- R$ {totalDespesas.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-gray-200 pt-2 mt-2">
                          <div className="flex justify-between font-bold">
                            <span className="text-gray-900">Líquido</span>
                            <span className="text-emerald-600">R$ {totalLiquido.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Card Consolidado */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 mt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Detalhamento Financeiro</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Bruto</span>
                      <span className="font-semibold text-emerald-600">R$ {totalizadores.totalBruto.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Comissões</span>
                      <span className="font-semibold text-orange-600">- R$ {totalizadores.totalComissoes.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Despesas</span>
                      <span className="font-semibold text-rose-600">- R$ {totalizadores.totalDespesas.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex justify-between font-bold">
                        <span className="text-gray-900">Total Líquido Final</span>
                        <span className="text-emerald-600 text-lg">R$ {totalizadores.totalLiquido.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Visualização: Por Ponto */}
            {visualizacao === 'ponto' && (
              <div className="space-y-3">
                {vendasPorPonto.map(([pontoId, vendas]) => {
                  const totalBruto = vendas.reduce((acc, v) => acc + (v.totalGeral || (v as any).liquidoDaMaquina || 0), 0);
                  const totalComissoes = vendas.reduce((acc, v) => acc + (v.valorComissao || 0), 0);
                  const totalDespesas = vendas.reduce((acc, v) => acc + (v.despesa || 0), 0);
                  const totalLiquido = vendas.reduce((acc, v) => acc + (v.totalFinal || 0), 0);
                  return (
                    <div key={pontoId} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold text-gray-900">{getNomePonto(pontoId)}</h4>
                        <span className="text-xs text-gray-500">{vendas.length} leitura{vendas.length > 1 ? 's' : ''}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Bruto</span>
                          <span className="font-semibold text-emerald-600">R$ {totalBruto.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Comissões</span>
                          <span className="font-semibold text-orange-600">- R$ {totalComissoes.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Despesas</span>
                          <span className="font-semibold text-rose-600">- R$ {totalDespesas.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-gray-200 pt-2 mt-2">
                          <div className="flex justify-between font-bold">
                            <span className="text-gray-900">Líquido</span>
                            <span className="text-emerald-600">R$ {totalLiquido.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Card Consolidado */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 mt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Detalhamento Financeiro</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Bruto</span>
                      <span className="font-semibold text-emerald-600">R$ {totalizadores.totalBruto.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Comissões</span>
                      <span className="font-semibold text-orange-600">- R$ {totalizadores.totalComissoes.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Despesas</span>
                      <span className="font-semibold text-rose-600">- R$ {totalizadores.totalDespesas.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex justify-between font-bold">
                        <span className="text-gray-900">Total Líquido Final</span>
                        <span className="text-emerald-600 text-lg">R$ {totalizadores.totalLiquido.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Visualização: Por Operador */}
            {visualizacao === 'operador' && (
              <div className="space-y-3">
                {vendasPorOperador.map(([operadorId, vendas]) => {
                  const totalBruto = vendas.reduce((acc, v) => acc + (v.totalGeral || (v as any).liquidoDaMaquina || 0), 0);
                  const totalComissoes = vendas.reduce((acc, v) => acc + (v.valorComissao || 0), 0);
                  const totalDespesas = vendas.reduce((acc, v) => acc + (v.despesa || 0), 0);
                  const totalLiquido = vendas.reduce((acc, v) => acc + (v.totalFinal || 0), 0);
                  return (
                    <div key={operadorId} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold text-gray-900">{getNomeOperador(operadorId)}</h4>
                        <span className="text-xs text-gray-500">{vendas.length} leitura{vendas.length > 1 ? 's' : ''}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Bruto</span>
                          <span className="font-semibold text-emerald-600">R$ {totalBruto.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Comissões</span>
                          <span className="font-semibold text-orange-600">- R$ {totalComissoes.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Despesas</span>
                          <span className="font-semibold text-rose-600">- R$ {totalDespesas.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-gray-200 pt-2 mt-2">
                          <div className="flex justify-between font-bold">
                            <span className="text-gray-900">Líquido</span>
                            <span className="text-emerald-600">R$ {totalLiquido.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Card Consolidado */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 mt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Detalhamento Financeiro</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Bruto</span>
                      <span className="font-semibold text-emerald-600">R$ {totalizadores.totalBruto.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Comissões</span>
                      <span className="font-semibold text-orange-600">- R$ {totalizadores.totalComissoes.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Despesas</span>
                      <span className="font-semibold text-rose-600">- R$ {totalizadores.totalDespesas.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex justify-between font-bold">
                        <span className="text-gray-900">Total Líquido Final</span>
                        <span className="text-emerald-600 text-lg">R$ {totalizadores.totalLiquido.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal de Período */}
        {showPeriodoModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Selecionar Período</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Data Início</label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={e => setDataInicio(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Data Fim</label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={e => setDataFim(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowPeriodoModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 font-semibold hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setFiltroTipo('periodo');
                    setShowPeriodoModal(false);
                  }}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Relatorios;
