import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getActiveCollection } from '../../services/operacionalService';
import { fecharMes } from '../../services/financeiroService';
import { Cota, Ponto, CentroCusto } from '../../types';
import { GlassCard, AlertBox, PageHeader, Badge, ButtonPrimary, ButtonSecondary, SelectField, InputField, Modal } from '../../components/MacOSDesign';
import { Lock, Calculator, Download, TrendingUp, Wallet, Plus, Printer, ChevronDown, ChevronRight, ListFilter, MapPin } from 'lucide-react';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '../../utils/formatters';

import { useLocalidade } from '../../contexts/LocalidadeContext';
import { useOperacional } from '../../contexts/OperacionalContext';
import { getResumoFinanceiro } from '../../services/financeiroService';

const CaixaGeral: React.FC = () => {
  const { userProfile } = useAuth();
  const { localidades, selectedLocalidade } = useLocalidade();

  const { pontosMap, centrosCustoMap: ccMap, cotas } = useOperacional();

  const [vendasTotal, setVendasTotal] = useState(0);
  const [despesasOp, setDespesasOp] = useState(0);
  const [adiantamentosTotal, setAdiantamentosTotal] = useState(0);
  const [valorDistribuir, setValorDistribuir] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  // Lists for Drawers
  const [listaDespesas, setListaDespesas] = useState<Array<{ descricao: string; valor: number; data: string; pontoId?: string; centroCustoId?: string }>>([]);
  const [listaAdiantamentos, setListaAdiantamentos] = useState<Array<{ descricao: string; valor: number; data: string }>>([]);

  // Drawer States
  const [detailsOpen, setDetailsOpen] = useState<{ despesas: boolean; adiantamentos: boolean }>({
    despesas: false,
    adiantamentos: false
  });

  // Modal de Adiantamento
  const [showAdiantamentoModal, setShowAdiantamentoModal] = useState(false);
  const [novoAdiantamento, setNovoAdiantamento] = useState({
    cotaId: '',
    valor: '',
    descricao: '',
    data: new Date().toISOString().split('T')[0]
  });
  const [adiantamentosMap, setAdiantamentosMap] = useState<Record<string, number>>({});

  // Filters state
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());

  // Calculated
  const lucroLiquido = vendasTotal - despesasOp;
  const baseRateio = valorDistribuir; // O valor digitado AGORA é o que será distribuído
  const capitalGiro = lucroLiquido - valorDistribuir; // O que sobra vira capital de giro


  const handleSalvarAdiantamento = async () => {
    if (!novoAdiantamento.cotaId || !novoAdiantamento.valor || !novoAdiantamento.data) {
      alert('Preencha os campos obrigatórios (Sócio, Valor, Data)');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'despesas_gerais'), {
        data: novoAdiantamento.data,
        descricao: novoAdiantamento.descricao || 'Vale/Adiantamento (Via Caixa Geral)',
        valor: parseFloat(novoAdiantamento.valor),
        tipo: 'adiantamento',
        cotaId: novoAdiantamento.cotaId,
        localidadeId: selectedLocalidade as string,
        active: true,
        origem: 'sistema',
        userId: userProfile?.uid
      });

      setShowAdiantamentoModal(false);
      setNovoAdiantamento({
        cotaId: '',
        valor: '',
        descricao: '',
        data: new Date().toISOString().split('T')[0]
      });

      // Feedback e Recálculo
      setMessage('Adiantamento lançado com sucesso!');
      setMessageType('success');
      calcularPrevia();

    } catch (error: any) {
      console.error(error);
      setMessage('Erro ao salvar adiantamento: ' + error.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const calcularPrevia = async () => {
    if (!selectedLocalidade) {
      setMessage('Selecione uma localidade no topo da página');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const resumo = await getResumoFinanceiro(selectedLocalidade, mes, ano);
      setVendasTotal(resumo.vendasTotal);
      setDespesasOp(resumo.despesasOp);
      setAdiantamentosTotal(resumo.totalAdiantamentos || 0);
      setAdiantamentosMap(resumo.adiantamentosPorCota || {});

      // Populate lists
      setListaDespesas(resumo.listaDespesas || []);
      setListaAdiantamentos(resumo.listaAdiantamentos || []);

      setMessageType('success');
      // Não exibe mensagem de sucesso intrusiva para cálculo, apenas atualiza valores
    } catch (error: any) {
      console.error('Erro ao calcular:', error);
      setMessage(error?.message || 'Erro ao calcular prévia');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Recalcular automaticamente quando mudar filtros
  useEffect(() => {
    if (selectedLocalidade) {
      calcularPrevia();
      verificarStatusFechamento();
    }
  }, [mes, ano, selectedLocalidade]);

  const verificarStatusFechamento = async () => {
    try {
      const q = query(
        collection(db, "fechamentos_mensais"),
        where("localidadeId", "==", selectedLocalidade),
        where("mes", "==", mes),
        where("ano", "==", ano)
      );
      const snapshot = await getDocs(q);
      setIsClosed(!snapshot.empty);
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setValorDistribuir(data.valorDistribuido || 0);
      } else {
        setValorDistribuir(0);
      }
    } catch (error) {
      console.error("Erro ao verificar fechamento:", error);
    }
  };

  const handleFecharMes = async () => {
    if (!userProfile) return;

    if (valorDistribuir > lucroLiquido) {
      setMessage('⚠️ SEGURANÇA: O valor p/ distribuição não pode ser maior que o Lucro Líquido!');
      setMessageType('error');
      return;
    }

    if (!window.confirm(`ATENÇÃO: Você está prestes a distribuir R$ ${formatCurrency(valorDistribuir)}.\n\nO restante (R$ ${formatCurrency(capitalGiro)}) ficará como Capital de Giro.\n\nIsso irá bloquear edições para este período. Confirmar?`)) return;

    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      await fecharMes(
        selectedLocalidade as string, mes, ano, valorDistribuir, userProfile.uid, cotas,
        { lucroLiquido }
      );
      setMessage('Mês fechado com sucesso!');
      setMessageType('success');
      setIsClosed(true);
    } catch (e: any) {
      setMessage(e?.message || 'Erro ao fechar mês');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const toggleDrawer = (key: 'despesas' | 'adiantamentos') => {
    setDetailsOpen(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isAuthorized = userProfile && ['admin', 'gerente', 'socio'].includes(userProfile.role);

  const handlePrint = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 14;
    const contentWidth = pageWidth - (marginX * 2);

    // --- Cores e Estilos ---
    // --- Cores e Estilos ---
    const headerBgColor = [200, 200, 200] as [number, number, number]; // Cinza
    const headerTextColor = [0, 0, 0] as [number, number, number];

    // --- 1. Cabeçalho Principal ---
    doc.setFillColor(...headerBgColor);
    doc.rect(marginX, 10, contentWidth, 10, 'F');

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...headerTextColor);
    doc.text('CAIXA E FECHAMENTO', pageWidth / 2, 16.5, { align: 'center' });

    // --- 2. Sub-cabeçalho (Info Box) ---
    const subHeaderY = 20;
    const subHeaderH = 12; // Altura um pouco maior para 2 linhas

    doc.setDrawColor(0);
    doc.rect(marginX, subHeaderY, contentWidth, subHeaderH);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    // Linha 1
    const periodoTexto = `PERIODO: ${mes}/${ano}`;
    doc.text(periodoTexto, marginX + 2, subHeaderY + 4.5);

    const geradoEmTexto = `GERADO EM: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`;
    const geradoEmWidth = doc.getTextWidth(geradoEmTexto);
    doc.text(geradoEmTexto, (marginX + contentWidth) - geradoEmWidth - 2, subHeaderY + 4.5);

    // Linha 2 (Divisória)
    doc.line(marginX, subHeaderY + 6, marginX + contentWidth, subHeaderY + 6);

    const localidadeNome = localidades.find(l => l.id === selectedLocalidade)?.nome || 'Todas';
    doc.text(`MES: ${mes}`, marginX + 2, subHeaderY + 10);
    doc.text(`ANO: ${ano}`, marginX + 40, subHeaderY + 10); // Ajuste manual X
    doc.text(`LOCALIDADE: ${localidadeNome.toUpperCase()}`, marginX + 80, subHeaderY + 10); // Ajuste manual X

    // --- 3. Tabelas Lado a Lado ---
    let currentY = subHeaderY + subHeaderH + 5;
    const gap = 4;
    const halfWidth = (contentWidth - gap) / 2;

    // --- LADO ESQUERDO: RATEIO ---
    // Título Rateio
    doc.setFillColor(...headerBgColor);
    doc.rect(marginX, currentY, halfWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('RATEIO', marginX + (halfWidth / 2), currentY + 5, { align: 'center' });

    // Dados Rateio
    const rateioData = cotas
      .filter(c => !(c.porcentagem === 0 && (c.saldoAcumulado || 0) === 0))
      .map(cota => {
        let parte = baseRateio * (cota.porcentagem / 100);
        if (baseRateio < 0 && !cota.participaPrejuizo) parte = 0;
        const adiantamento = adiantamentosMap[cota.id] || 0;
        const final = parte + cota.saldoAcumulado - adiantamento;

        return [
          cota.nome,
          `R$ ${formatCurrency(parte + cota.saldoAcumulado)}`, // Saldo (Parte + Ant)
          `R$ ${formatCurrency(adiantamento)}`,
          `R$ ${formatCurrency(final)}`
        ];
      });

    autoTable(doc, {
      startY: currentY + 7,
      head: [['SOCIO', 'SALDO', 'VALE', 'FINAL']],
      body: rateioData,
      theme: 'plain',
      tableWidth: halfWidth,
      margin: { left: marginX },
      styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.1 },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold' }
      }
    } as any);

    const finalYRateio = (doc as any).lastAutoTable.finalY;

    // --- LADO DIREITO: RESUMO OPERACIONAL ---
    // Título Resumo
    const rightStartX = marginX + halfWidth + gap;
    doc.setFillColor(...headerBgColor);
    doc.rect(rightStartX, currentY, halfWidth, 7, 'F');
    doc.text('RESUMO OPERACIONAL', rightStartX + (halfWidth / 2), currentY + 5, { align: 'center' });

    // Dados Resumo (Tabela de 1 linha com colunas)
    const resumoData = [[
      `R$ ${formatCurrency(vendasTotal)}`,
      `R$ ${formatCurrency(despesasOp)}`,
      `R$ ${formatCurrency(adiantamentosTotal)}`,
      `R$ ${formatCurrency(lucroLiquido)}`
    ]];

    autoTable(doc, {
      startY: currentY + 7,
      head: [['VENDAS', 'DESPESAS', 'VALE', 'LUCRO']],
      body: resumoData,
      theme: 'plain',
      tableWidth: halfWidth,
      margin: { left: rightStartX },
      styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, halign: 'center' },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1 },
    } as any);

    const finalYResumo = (doc as any).lastAutoTable.finalY;

    // --- 4. Tabela Inferior (Totais / Rateio) ---
    // Posicionar abaixo da maior tabela
    let bottomY = Math.max(finalYRateio, finalYResumo) + 5;

    // Tabela Totais
    const totaisData = [[
      `R$ ${formatCurrency(baseRateio)}`,
      `R$ ${formatCurrency(capitalGiro)}`
    ]];

    autoTable(doc, {
      startY: bottomY,
      head: [['VALOR DISTRIBUÍDO', 'CAPITAL DE GIRO']],
      body: totaisData,
      theme: 'plain',
      tableWidth: halfWidth, // Alinhado com a tabela da esquerda
      margin: { left: marginX },
      styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, halign: 'center' },
      headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1 }, // Grey Header for bottom table looks good
    } as any);

    doc.save(`caixa_geral_${mes}_${ano}.pdf`);
  };

  return (
    <div className="w-full">
      <PageHeader
        title="Caixa Geral & Fechamento"
        subtitle="Visualize resumos financeiros e feche períodos"
      />

      {!isAuthorized && (
        <AlertBox
          type="warning"
          message={`Seu perfil(${userProfile?.role}) não possui permissão para acessar a caixa.`}
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

      {/* Compact Filters Bar */}
      <div className="bg-white/80 backdrop-blur-md border border-gray-200/50 rounded-xl p-3 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <div className="flex items-center gap-2 min-w-[140px]">
            <span className="text-xs font-semibold text-gray-500 uppercase">Mês</span>
            <select
              value={mes}
              onChange={e => setMes(Number(e.target.value))}
              disabled={!isAuthorized}
              className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 outline-none"
            >
              {[...Array(12)].map((_, i) => <option key={i} value={i + 1}>Mês {i + 1}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 w-[120px]">
            <span className="text-xs font-semibold text-gray-500 uppercase">Ano</span>
            <input
              type="number"
              value={ano}
              onChange={e => setAno(Number(e.target.value))}
              disabled={!isAuthorized}
              className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 min-w-[200px]">
            <span className="text-xs font-semibold text-gray-500 uppercase">Local Selecionado</span>
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-bold rounded-lg px-3 py-2 flex items-center gap-2">
              <MapPin size={14} className="text-emerald-500" />
              {localidades.find(loc => loc.id === selectedLocalidade)?.nome || selectedLocalidade || 'Nenhum'}
            </div>
          </div>
        </div>

        <button
          onClick={calcularPrevia}
          disabled={!isAuthorized || loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium transition-colors w-full md:w-auto justify-center"
        >
          <Calculator size={16} /> Recalcular
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">

        {/* --- LEFT COLUMN: Simulation Table (Compact) --- */}
        <div className="lg:col-span-5 order-2 lg:order-1">
          <GlassCard className="p-4 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-semibold text-gray-900">Simulação de Rateio</h2>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="p-2 text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100"
                  title="Imprimir / Exportar"
                >
                  <Printer size={16} />
                </button>
                <button
                  onClick={handleFecharMes}
                  disabled={!isAuthorized || loading || !selectedLocalidade || isClosed}
                  className={`p-2 rounded-lg transition-colors border ${isClosed
                    ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                    : 'text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-100 disabled:opacity-50'
                    }`}
                  title={isClosed ? "Período Encerrado" : "Fechar Mês"}
                >
                  <Lock size={16} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-100 rounded-lg flex-1">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500">
                  <tr>
                    <th className="px-2 py-2 font-medium">Sócio</th>
                    <th className="px-2 py-2 font-medium">%</th>
                    <th className="px-2 py-2 font-medium text-right">Saldo</th>
                    <th className="px-2 py-2 font-medium text-right text-red-500">Vales</th>
                    <th className="px-2 py-2 font-bold text-right text-gray-800">Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cotas.length === 0 ? (
                    <tr><td colSpan={5} className="px-2 py-4 text-center text-gray-400">Sem dados</td></tr>
                  ) : (
                    cotas
                      .filter(c => !(c.porcentagem === 0 && (c.saldoAcumulado || 0) === 0))
                      .map(cota => {
                        let parte = baseRateio * (cota.porcentagem / 100);
                        if (baseRateio < 0 && !cota.participaPrejuizo) parte = 0;
                        const adiantamento = adiantamentosMap[cota.id] || 0;
                        const final = parte + cota.saldoAcumulado - adiantamento;

                        return (
                          <tr key={cota.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-2 py-2 font-medium text-gray-900 truncate max-w-[80px]" title={cota.nome}>{cota.nome}</td>
                            <td className="px-2 py-2 text-gray-500">{cota.porcentagem}%</td>
                            <td className="px-2 py-2 text-right">
                              <div className="flex flex-col">
                                <span className={parte >= 0 ? "text-green-600 font-semibold" : "text-red-600"}>{formatCurrency(parte)}</span>
                                {cota.saldoAcumulado !== 0 && <span className="text-[10px] text-gray-400">Ant: {cota.saldoAcumulado}</span>}
                              </div>
                            </td>
                            <td className="px-2 py-2 text-right text-red-500 font-medium">
                              {adiantamento > 0 ? formatCurrency(adiantamento) : '-'}
                            </td>
                            <td className="px-2 py-2 text-right font-bold text-gray-900 bg-gray-50/30">
                              R$ {formatCurrency(final)}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>

        {/* --- RIGHT COLUMN: Operational Summary with Drawers --- */}
        <div className="lg:col-span-7 order-1 lg:order-2">
          <GlassCard className="p-5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                  <TrendingUp size={20} />
                </div>
                <h2 className="text-lg font-bold text-gray-800">Resumo Operacional</h2>
              </div>
              <button
                onClick={() => setShowAdiantamentoModal(true)}
                disabled={!isAuthorized || !selectedLocalidade}
                className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-full text-xs font-bold transition-colors border border-orange-100"
              >
                <Plus size={14} /> NOVO VALE
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-gray-100 shadow-inner">
                <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${vendasTotal > 0 ? (despesasOp / vendasTotal) * 100 : 0}% ` }} />
                <div className="bg-orange-400 h-full transition-all duration-500" style={{ width: `${vendasTotal > 0 ? (adiantamentosTotal / vendasTotal) * 100 : 0}% ` }} />
                <div className="bg-emerald-500 h-full flex-1 transition-all duration-500" />
              </div>
              <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <div className="flex gap-4">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"></div>Despesas</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-400"></div>Vales</span>
                </div>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>Lucro</span>
              </div>
            </div>

            <div className="space-y-1">
              {/* Row: Vendas */}
              <div className="group flex justify-between items-center py-3 px-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                <span className="text-gray-600 font-medium text-sm">Total de Vendas</span>
                <span className="font-bold text-gray-900 text-base">
                  R$ {formatCurrency(vendasTotal)}
                </span>
              </div>

              {/* Drawer: Despesas */}
              <div className="border border-gray-100 rounded-lg overflow-hidden transition-all">
                <button
                  onClick={() => toggleDrawer('despesas')}
                  className="w-full flex justify-between items-center py-3 px-3 bg-white hover:bg-rose-50/30 transition-colors"
                >
                  <div className="flex items-center gap-2 text-gray-600 font-medium text-sm">
                    {detailsOpen.despesas ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    Despesas Operacionais
                  </div>
                  <span className="font-bold text-rose-600 text-base">
                    R$ {formatCurrency(despesasOp)}
                  </span>
                </button>

                {detailsOpen.despesas && (
                  <div className="bg-gray-50/50 border-t border-gray-100 p-3 max-h-60 overflow-y-auto">
                    {listaDespesas.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-2">Nenhuma despesa registrada</p>
                    ) : (
                      <table className="w-full text-xs">
                        <tbody>
                          {listaDespesas.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-200/50 last:border-0 hover:bg-gray-50">
                              <td className="py-2 text-gray-500 w-[80px] align-top">{new Date(item.data).toLocaleDateString('pt-BR')}</td>
                              <td className="py-2 text-gray-700 font-medium align-top">
                                <div className="leading-tight">{item.descricao}</div>
                                {(item.pontoId || item.centroCustoId) && (
                                  <div className="text-[10px] text-gray-400 uppercase font-semibold mt-0.5">
                                    {item.pontoId ? (pontosMap[item.pontoId]?.nome || 'Ponto não encontrado') : (ccMap[item.centroCustoId || '']?.nome || 'Sem C.Custo')}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 text-right text-rose-600 font-semibold align-top whitespace-nowrap">
                                {formatCurrency(item.valor)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>

              {/* Drawer: Adiantamentos */}
              <div className="border border-gray-100 rounded-lg overflow-hidden transition-all mt-1">
                <button
                  onClick={() => toggleDrawer('adiantamentos')}
                  className="w-full flex justify-between items-center py-3 px-3 bg-white hover:bg-orange-50/30 transition-colors"
                >
                  <div className="flex items-center gap-2 text-gray-600 font-medium text-sm">
                    {detailsOpen.adiantamentos ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    Adiantamentos (Vales)
                  </div>
                  <span className="font-bold text-orange-600 text-base">
                    R$ {formatCurrency(adiantamentosTotal)}
                  </span>
                </button>

                {detailsOpen.adiantamentos && (
                  <div className="bg-gray-50/50 border-t border-gray-100 p-3 max-h-60 overflow-y-auto">
                    {listaAdiantamentos.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-2">Nenhum vale registrado</p>
                    ) : (
                      <table className="w-full text-xs">
                        <tbody>
                          {listaAdiantamentos.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-200/50 last:border-0">
                              <td className="py-1.5 text-gray-500 w-[80px]">{new Date(item.data).toLocaleDateString('pt-BR')}</td>
                              <td className="py-1.5 text-gray-700 font-medium truncate max-w-[200px]" title={item.descricao}>{item.descricao}</td>
                              <td className="py-1.5 text-right text-orange-600 font-semibold">{formatCurrency(item.valor)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>

              {/* Row: Lucro Líquido */}
              <div className="flex justify-between items-center py-4 px-3 mt-2 bg-emerald-50/30 rounded-lg border border-emerald-100/50">
                <span className="text-gray-800 font-bold text-base">Lucro Líquido</span>
                <span className="font-bold text-emerald-600 text-xl">
                  R$ {formatCurrency(lucroLiquido)}
                </span>
              </div>

              {/* Distribuição Input */}
              <div className="mt-4 px-1">
                <div className={`flex items-center gap-3 border rounded-lg p-3 transition-colors ${isClosed ? 'bg-gray-50 border-gray-200' :
                  valorDistribuir > lucroLiquido
                    ? 'bg-red-50 border-red-200 animate-pulse'
                    : 'bg-blue-50/50 border-blue-100'
                  }`}>
                  <label className={`text-xs font-bold uppercase whitespace-nowrap ${isClosed ? 'text-gray-500' :
                    valorDistribuir > lucroLiquido ? 'text-red-700' : 'text-blue-700'
                    }`}>
                    {isClosed ? 'Valor Distribuído (Fixo)' : 'Valor p/ Distribuição (Rateio)'}
                  </label>
                  <input
                    type="number"
                    value={valorDistribuir || ''}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setValorDistribuir(val);
                      if (val > lucroLiquido) {
                        setMessageType('error');
                        setMessage('⚠️ SEGURANÇA: Valor de distribuição maior que o lucro líquido!');
                      } else {
                        setMessage('');
                      }
                    }}
                    disabled={!isAuthorized || isClosed}
                    className={`w-full bg-transparent border-b text-right font-bold focus:outline-none text-sm py-1 placeholder-gray-300 ${isClosed ? 'border-transparent text-gray-500' :
                      valorDistribuir > lucroLiquido
                        ? 'border-red-300 text-red-700 focus:border-red-500'
                        : 'border-blue-200 text-gray-800 focus:border-blue-500'
                      }`}
                    placeholder="R$ 0,00"
                  />
                </div>
                {valorDistribuir > lucroLiquido && (
                  <p className="text-[10px] text-red-600 font-bold mt-1 ml-1 flex items-center gap-1">
                    <span>❌</span> Excedeu Lucro Líquido em R$ {formatCurrency(valorDistribuir - lucroLiquido)}
                  </p>
                )}
              </div>

              {/* Capital de Giro */}
              <div className="flex justify-between pt-4 px-3">
                <span className="text-gray-500 text-sm font-medium">Capital de Giro (P/ Próximo Mês)</span>
                <span className={`font-bold text-lg ${capitalGiro < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                  R$ {formatCurrency(capitalGiro)}
                </span>
              </div>

            </div>
          </GlassCard>
        </div>
      </div>

      {/* Modal Lançar Adiantamento */}
      <Modal
        isOpen={showAdiantamentoModal}
        onClose={() => setShowAdiantamentoModal(false)}
        title="Lançar Vale / Adiantamento"
        actions={
          <>
            <ButtonSecondary onClick={() => setShowAdiantamentoModal(false)} disabled={loading}>
              Cancelar
            </ButtonSecondary>
            <ButtonPrimary onClick={handleSalvarAdiantamento} disabled={loading}>
              {loading ? 'Confirmar' : 'Confirmar'}
            </ButtonPrimary>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 mb-4">
            <p className="text-xs text-orange-800">
              <strong>Atenção:</strong> Valor será descontado do saldo do sócio.
            </p>
          </div>

          <SelectField
            label="Sócio / Cota Destino"
            value={novoAdiantamento.cotaId}
            onChange={(e) => setNovoAdiantamento({ ...novoAdiantamento, cotaId: e.target.value })}
            required
            options={[
              { value: '', label: 'Selecione...' },
              ...cotas.map(c => ({ value: c.id, label: c.nome }))
            ]}
          />

          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Valor (R$)"
              type="number"
              value={novoAdiantamento.valor || ''}
              onChange={(e) => setNovoAdiantamento({ ...novoAdiantamento, valor: e.target.value })}
              required
              placeholder="0,00"
            />
            <InputField
              label="Data"
              type="date"
              value={novoAdiantamento.data}
              onChange={(e) => setNovoAdiantamento({ ...novoAdiantamento, data: e.target.value })}
              required
            />
          </div>

          <InputField
            label="Descrição"
            value={novoAdiantamento.descricao}
            onChange={(e) => setNovoAdiantamento({ ...novoAdiantamento, descricao: e.target.value })}
            placeholder="Ex: Vale transporte..."
          />
        </div>
      </Modal>
    </div>
  );
};

export default CaixaGeral;