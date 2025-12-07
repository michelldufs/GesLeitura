import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalidade } from '../../contexts/LocalidadeContext';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { getUltimaLeitura, saveVenda, updateVenda } from '../../services/financeiroService';
import { Operador, Venda } from '../../types';
import { GlassCard, AlertBox, PageHeader, Modal, ButtonPrimary, ButtonSecondary } from '../../components/MacOSDesign';
import { Plus, FileText, Eye, Camera, Edit2 } from 'lucide-react';
import { getTodayDateString } from '../../utils/dateUtils';

interface Ponto {
  id: string;
  codigo: string;
  nome: string;
  localidadeId: string;
  rotaId?: string;
  comissao?: number;
  participaDespesa?: boolean;
}

interface Rota {
  id: string;
  codigo: string;
  nome: string;
  localidadeId: string;
}

const LancamentoManual: React.FC = () => {
  const { userProfile } = useAuth();
  const { selectedLocalidade } = useLocalidade();
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [pontosFiltrados, setPontosFiltrados] = useState<Ponto[]>([]);
  const [operadores, setOperadores] = useState<any[]>([]); // Lista completa para tabela
  const [operadoresFiltrados, setOperadoresFiltrados] = useState<any[]>([]); // Filtrados por ponto
  const [rotas, setRotas] = useState<any[]>([]);
  const [rotasIndex, setRotasIndex] = useState<Record<string, any>>({});
  const [vendas, setVendas] = useState<any[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<any[]>([]);
  const [selectedRotaId, setSelectedRotaId] = useState<string>('');
  const [selectedPontoId, setSelectedPontoId] = useState<string>('');
  const [selectedOperadorId, setSelectedOperadorId] = useState<string>('');
  const [selectedPonto, setSelectedPonto] = useState<Ponto | null>(null);
  const [selectedOperador, setSelectedOperador] = useState<any | null>(null);
  const [filtroData, setFiltroData] = useState<string>(getTodayDateString());
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingVendas, setLoadingVendas] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'warning' | ''>('');
  const [showModal, setShowModal] = useState(false);
  const [showDetalheModal, setShowDetalheModal] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState<any>(null);
  const [editandoDetalhe, setEditandoDetalhe] = useState(false);
  const [detalheEditado, setDetalheEditado] = useState<any>(null);
  const [loadingSalvarDetalhe, setLoadingSalvarDetalhe] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<Venda>({
    defaultValues: {
      data: getTodayDateString(),
      comissaoPorcentagem: 0,
      despesa: undefined,
      entradaAnterior: undefined,
      entradaAtual: undefined,
      saidaAnterior: undefined,
      saidaAtual: undefined
    }
  });

  // Helper to avoid NaN in calculations
  const toSafeNumber = (val: any) => {
    const n = Number(val ?? 0);
    return Number.isFinite(n) ? n : 0;
  };

  // Calculations state (coerced and sanitized)
  const entradaAtual = toSafeNumber(watch('entradaAtual'));
  const entradaAnterior = toSafeNumber(watch('entradaAnterior'));
  const saidaAtual = toSafeNumber(watch('saidaAtual'));
  const saidaAnterior = toSafeNumber(watch('saidaAnterior'));
  const comissaoPorcentagem = toSafeNumber(watch('comissaoPorcentagem'));
  const despesa = toSafeNumber(watch('despesa'));
  const centroCustoId = watch('centroCustoId', '');

  const totalEntrada = toSafeNumber(entradaAtual - entradaAnterior);
  const totalSaida = toSafeNumber(saidaAtual - saidaAnterior);
  const entradaMenosSaida = toSafeNumber(totalEntrada - totalSaida);

  // Aplicar fator de conversão para obter líquido da máquina
  const fatorConversao = toSafeNumber(selectedOperador?.fatorConversao) || 1;
  const liquidoDaMaquina = toSafeNumber(entradaMenosSaida * fatorConversao);

  // Verificar se ponto participa da despesa
  const pontoParticipaDespesa = selectedPonto?.participaDespesa ?? true;

  // Calcular comissão e lucro baseado na regra do ponto
  let valorComissao = 0;
  let totalFinal = 0;

  if (pontoParticipaDespesa) {
    // Participa: Líquido - Despesa, depois Comissão
    const liquidoAposDespesa = toSafeNumber(liquidoDaMaquina - despesa);
    valorComissao = liquidoAposDespesa > 0 ? toSafeNumber(liquidoAposDespesa * (comissaoPorcentagem / 100)) : 0;
    totalFinal = toSafeNumber(liquidoAposDespesa - valorComissao);
  } else {
    // Não participa: Comissão direto, sem despesa
    valorComissao = liquidoDaMaquina > 0 ? toSafeNumber(liquidoDaMaquina * (comissaoPorcentagem / 100)) : 0;
    totalFinal = toSafeNumber(liquidoDaMaquina - valorComissao);
  }

  // totalGeral mantido para compatibilidade (será líquido da máquina)
  const totalGeral = liquidoDaMaquina;

  useEffect(() => {
    loadPontos();
    loadVendas();
    loadAllOperadores(); // Carregar todos operadores para exibir na tabela
    loadRotas();
    loadCentrosCusto();
  }, [selectedLocalidade]);

  const loadAllOperadores = async () => {
    if (!selectedLocalidade) {
      setOperadores([]);
      return;
    }

    try {
      const operadoresQuery = query(
        collection(db, 'operadores'),
        where('active', '==', true),
        where('localidadeId', '==', selectedLocalidade)
      );
      const snapshot = await getDocs(operadoresQuery);
      const operadoresData = snapshot.docs.map(doc => ({
        id: doc.id,
        codigo: doc.data().codigo,
        nome: doc.data().nome,
        pontoId: doc.data().pontoId,
        fatorConversao: doc.data().fatorConversao || 0.01
      }));
      operadoresData.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
      setOperadores(operadoresData);
    } catch (error) {
      console.error('Erro ao carregar operadores:', error);
    }
  };

  const loadCentrosCusto = async () => {
    if (!selectedLocalidade) {
      setCentrosCusto([]);
      return;
    }

    try {
      const centrosQuery = query(
        collection(db, 'centrosCusto'),
        where('active', '==', true),
        where('localidadeId', '==', selectedLocalidade)
      );
      const snapshot = await getDocs(centrosQuery);
      const centrosData = snapshot.docs.map(doc => ({
        id: doc.id,
        nome: doc.data().nome,
        descricao: doc.data().descricao
      }));
      centrosData.sort((a, b) => a.nome.localeCompare(b.nome));
      console.log('Centros de Custo carregados:', centrosData);
      setCentrosCusto(centrosData);
    } catch (error) {
      console.error('Erro ao carregar centros de custo:', error);
    }
  };

  const loadRotas = async () => {
    if (!selectedLocalidade) {
      setRotas([]);
      setRotasIndex({});
      return;
    }

    try {
      const rotasQuery = query(
        collection(db, 'rotas'),
        where('active', '==', true),
        where('localidadeId', '==', selectedLocalidade)
      );
      const snapshot = await getDocs(rotasQuery);
      const rotasData = snapshot.docs.map(doc => ({
        id: doc.id,
        nome: doc.data().nome
      }));
      rotasData.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
      setRotas(rotasData);

      // Criar índice para acesso rápido
      const rotasIndexMap: Record<string, any> = {};
      rotasData.forEach(rota => {
        rotasIndexMap[rota.id] = rota;
      });
      setRotasIndex(rotasIndexMap);
    } catch (error) {
      console.error('Erro ao carregar rotas:', error);
    }
  };

  // Filtrar pontos quando rota é selecionada
  useEffect(() => {
    if (selectedRotaId) {
      const pontosDaRota = pontos.filter(p => p.rotaId === selectedRotaId);
      setPontosFiltrados(pontosDaRota);
      setSelectedPontoId('');
      setSelectedOperadorId('');
      setValue('pontoId', '');
      setValue('operadorId', '');
    } else {
      setPontosFiltrados(pontos); // Mostra todos se nenhuma rota selecionada
      setSelectedPontoId('');
      setSelectedOperadorId('');
    }
  }, [selectedRotaId, pontos]);

  // Filtrar operadores por ponto e remover já lidos hoje
  useEffect(() => {
    const loadOperadoresPendentes = async () => {
      if (selectedPontoId) {
        const filtered = operadores.filter(op => op.pontoId === selectedPontoId);
        
        // Buscar leituras do dia atual para este ponto
        try {
          const hoje = getTodayDateString();
          const vendasHojeQuery = query(
            collection(db, 'vendas'),
            where('pontoId', '==', selectedPontoId),
            where('data', '==', hoje)
          );
          const vendasSnap = await getDocs(vendasHojeQuery);
          const operadoresLidosHoje = vendasSnap.docs.map(doc => doc.data().operadorId);
          
          // Filtrar operadores não lidos hoje
          const pendentes = filtered.filter(op => !operadoresLidosHoje.includes(op.id));
          setOperadoresFiltrados(pendentes);
        } catch (error) {
          console.error('Erro ao filtrar operadores:', error);
          setOperadoresFiltrados(filtered);
        }
      } else {
        setOperadoresFiltrados([]);
        setValue('operadorId', '');
      }
    };

    loadOperadoresPendentes();
  }, [selectedPontoId, operadores]);

  const loadPontos = async () => {
    if (!selectedLocalidade) {
      setPontos([]);
      return;
    }

    try {
      const pontosQuery = query(
        collection(db, 'pontos'),
        where('active', '==', true),
        where('localidadeId', '==', selectedLocalidade)
      );
      const snapshot = await getDocs(pontosQuery);
      const pontosData = snapshot.docs.map(doc => ({
        id: doc.id,
        codigo: doc.data().codigo,
        nome: doc.data().nome,
        localidadeId: doc.data().localidadeId,
        comissao: doc.data().comissao || 0,
        participaDespesa: doc.data().participaDespesa
      } as Ponto));
      // Ordenar por código crescente
      pontosData.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
      setPontos(pontosData);
    } catch (error) {
      console.error('Erro ao carregar pontos:', error);
    }
  };

  const loadVendas = async () => {
    if (!selectedLocalidade) {
      setVendas([]);
      return;
    }

    setLoadingVendas(true);
    try {
      console.log('Carregando vendas para localidade:', selectedLocalidade);

      let snapshot;
      let vendasData: any[] = [];

      // Tentar query com active e localidadeId
      try {
        const vendasQuery = query(
          collection(db, 'vendas'),
          where('localidadeId', '==', selectedLocalidade),
          limit(50)
        );
        snapshot = await getDocs(vendasQuery);

        // Filtrar manualmente por active (caso o campo exista)
        vendasData = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter((venda: any) => venda.active !== false); // Inclui documentos sem o campo active

        console.log('Query 1 - Total documentos:', snapshot.docs.length, 'Após filtro active:', vendasData.length);
      } catch (error1: any) {
        console.warn('Erro na query 1:', error1.message);

        // Fallback: buscar todas as vendas e filtrar manualmente
        try {
          const allVendasQuery = query(
            collection(db, 'vendas'),
            limit(100)
          );
          snapshot = await getDocs(allVendasQuery);

          vendasData = snapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            .filter((venda: any) =>
              venda.localidadeId === selectedLocalidade &&
              venda.active !== false
            );

          console.log('Query 2 (fallback) - Total documentos:', snapshot.docs.length, 'Após filtros:', vendasData.length);
        } catch (error2) {
          console.error('Erro na query fallback:', error2);
        }
      }

      // Ordenar manualmente por data
      vendasData.sort((a: any, b: any) => {
        const dateA = new Date(a.data || 0).getTime();
        const dateB = new Date(b.data || 0).getTime();
        return dateB - dateA; // Decrescente (mais recente primeiro)
      });

      console.log('Vendas carregadas:', vendasData.length, vendasData);
      setVendas(vendasData);

      if (vendasData.length === 0) {
        console.warn('Nenhuma venda encontrada. Verifique se as vendas no Firebase têm localidadeId:', selectedLocalidade);
      }
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
      setMessage('Erro ao carregar leituras. Verifique o console para mais detalhes.');
      setMessageType('error');
    } finally {
      setLoadingVendas(false);
    }
  };



  const handlePontoChange = (pontoId: string) => {
    setSelectedPontoId(pontoId);
    setSelectedOperadorId('');
    setSelectedOperador(null);
    setValue('operadorId', '');

    const ponto = pontos.find(p => p.id === pontoId);
    setSelectedPonto(ponto || null);

    if (ponto && ponto.comissao !== undefined) {
      setValue('comissaoPorcentagem', ponto.comissao);
    }
  };

  const handleOperadorChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const opId = e.target.value;
    setSelectedOperadorId(opId);
    setValue('operadorId', opId);

    // Sempre inicializar com 0 por segurança
    setValue('entradaAnterior', 0);
    setValue('saidaAnterior', 0);

    if (!opId) {
      setSelectedOperador(null);
      return;
    }

    setLoadingHistory(true);
    try {
      const operador = operadoresFiltrados.find(op => op.id === opId);
      setSelectedOperador(operador);

      // Verificar se já existe leitura para este operador hoje
      const hoje = getTodayDateString();
      const jemLeituraHoje = vendas.some(v => v.operadorId === opId && v.data === hoje);

      if (jemLeituraHoje) {
        setMessage(`⚠️ Já existe uma leitura para esta máquina hoje (${hoje}). Não é permitido registrar duas leituras no mesmo dia.`);
        setMessageType('warning');
        setSelectedOperadorId('');
        setValue('operadorId', '');
        setSelectedOperador(null);
        setLoadingHistory(false);
        return;
      }

      console.log('Buscando última leitura para operador ID:', opId, 'Nome:', operador?.nome);
      const last = await getUltimaLeitura(opId);

      if (last) {
        console.log('Última leitura encontrada - Entrada:', last.entradaAtual, 'Saída:', last.saidaAtual);
        setValue('entradaAnterior', last.entradaAtual || 0);
        setValue('saidaAnterior', last.saidaAtual || 0);
      } else {
        console.log('Nenhuma leitura anterior encontrada para este operador');
      }
    } catch (err) {
      console.error('Erro ao buscar última leitura:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenModal = () => {
    reset({
      data: getTodayDateString(),
      comissaoPorcentagem: 0,
      despesa: undefined,
      entradaAnterior: undefined,
      saidaAnterior: undefined,
      entradaAtual: undefined,
      saidaAtual: undefined
    });
    setSelectedRotaId('');
    setSelectedPontoId('');
    setSelectedOperadorId('');
    setSelectedPonto(null);
    setSelectedOperador(null);
    setMessage('');
    setMessageType('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleAbrirDetalhe = (venda: any) => {
    setVendaSelecionada(venda);
    setEditandoDetalhe(false);
    setShowDetalheModal(true);
  };

  const handleFecharDetalhe = () => {
    setShowDetalheModal(false);
    setVendaSelecionada(null);
    setEditandoDetalhe(false);
    setDetalheEditado(null);
  };

  const handleSalvarEdicaoDetalhe = async () => {
    if (!userProfile || !vendaSelecionada || !detalheEditado) return;

    // Validar centro de custo se houver despesa
    if (detalheEditado.despesa > 0 && !detalheEditado.centroCustoId) {
      setMessage('Por favor, selecione um Centro de Custo para a despesa informada.');
      setMessageType('error');
      return;
    }

    setLoadingSalvarDetalhe(true);
    try {
      // Recalcular valores com base nas edições
      const entradaAtualEditada = toSafeNumber(detalheEditado.entradaAtual);
      const entradaAnteriorEditada = toSafeNumber(detalheEditado.entradaAnterior);
      const saidaAtualEditada = toSafeNumber(detalheEditado.saidaAtual);
      const saidaAnteriorEditada = toSafeNumber(detalheEditado.saidaAnterior);
      const comissaoEditada = toSafeNumber(detalheEditado.comissaoPorcentagem);
      const despesaEditada = toSafeNumber(detalheEditado.despesa);

      const totalEntradaEditada = toSafeNumber(entradaAtualEditada - entradaAnteriorEditada);
      const totalSaidaEditada = toSafeNumber(saidaAtualEditada - saidaAnteriorEditada);
      const entradaMenosSaidaEditada = toSafeNumber(totalEntradaEditada - totalSaidaEditada);

      const fatorConversaoEditado = toSafeNumber(detalheEditado.fatorConversao) || 1;
      const liquidoDaMaquinaEditado = toSafeNumber(entradaMenosSaidaEditada * fatorConversaoEditado);

      // Verificar se ponto participa da despesa
      const pontoParticipaDespesa = detalheEditado.participaDespesa ?? vendaSelecionada.participaDespesa ?? true;

      let valorComissaoEditado = 0;
      let totalFinalEditado = 0;

      if (pontoParticipaDespesa) {
        // Participa: Líquido - Despesa, depois Comissão
        const liquidoAposDespesa = toSafeNumber(liquidoDaMaquinaEditado - despesaEditada);
        valorComissaoEditado = liquidoAposDespesa > 0 ? toSafeNumber(liquidoAposDespesa * (comissaoEditada / 100)) : 0;
        totalFinalEditado = toSafeNumber(liquidoAposDespesa - valorComissaoEditado);
      } else {
        // Não participa: Comissão direto, sem despesa
        valorComissaoEditado = liquidoDaMaquinaEditado > 0 ? toSafeNumber(liquidoDaMaquinaEditado * (comissaoEditada / 100)) : 0;
        totalFinalEditado = toSafeNumber(liquidoDaMaquinaEditado - valorComissaoEditado);
      }

      const payload = {
        entradaAnterior: entradaAnteriorEditada,
        entradaAtual: entradaAtualEditada,
        saidaAnterior: saidaAnteriorEditada,
        saidaAtual: saidaAtualEditada,
        totalEntrada: totalEntradaEditada,
        totalSaida: totalSaidaEditada,
        totalGeral: liquidoDaMaquinaEditado,
        comissaoPorcentagem: comissaoEditada,
        valorComissao: valorComissaoEditado,
        despesa: despesaEditada,
        totalFinal: totalFinalEditado,
        fatorConversao: fatorConversaoEditado,
        participaDespesa: detalheEditado.participaDespesa ?? vendaSelecionada.participaDespesa ?? true,
        ...(detalheEditado.centroCustoId ? { centroCustoId: detalheEditado.centroCustoId } : {}),
        userName: vendaSelecionada.userName || vendaSelecionada.userDisplayName || vendaSelecionada.userId,
        userDisplayName: vendaSelecionada.userDisplayName || vendaSelecionada.userName || vendaSelecionada.userId
      };

      await updateVenda(vendaSelecionada.id, payload, userProfile.uid);

      setMessage('Leitura atualizada com sucesso!');
      setMessageType('success');
      setEditandoDetalhe(false);
      setDetalheEditado(null);

      // Recarregar vendas após 1 segundo
      setTimeout(() => {
        loadVendas();
        handleFecharDetalhe();
      }, 1000);
    } catch (error: any) {
      setMessage(error.message || 'Erro ao atualizar leitura');
      setMessageType('error');
    } finally {
      setLoadingSalvarDetalhe(false);
    }
  };

  // Função auxiliar para recalcular valores quando entrada/saída são alteradas
  const recalcularValoresDetalhe = (novoDetalhe: any) => {
    const entradaAtual = toSafeNumber(novoDetalhe.entradaAtual);
    const entradaAnterior = toSafeNumber(novoDetalhe.entradaAnterior);
    const saidaAtual = toSafeNumber(novoDetalhe.saidaAtual);
    const saidaAnterior = toSafeNumber(novoDetalhe.saidaAnterior);
    const comissaoPorcentagem = toSafeNumber(novoDetalhe.comissaoPorcentagem);
    const despesa = toSafeNumber(novoDetalhe.despesa);
    const fatorConversao = toSafeNumber(
      novoDetalhe.fatorConversao ?? vendaSelecionada?.fatorConversao ?? 1
    ) || 1;

    // Cálculos
    const totalEntrada = toSafeNumber(entradaAtual - entradaAnterior);
    const totalSaida = toSafeNumber(saidaAtual - saidaAnterior);
    const entradaMenosSaida = toSafeNumber(totalEntrada - totalSaida);
    const liquidoDaMaquina = toSafeNumber(entradaMenosSaida * fatorConversao);

    // Verificar se ponto participa da despesa (usar valor salvo na venda)
    const pontoParticipaDespesa = novoDetalhe.participaDespesa ?? vendaSelecionada?.participaDespesa ?? true;

    let valorComissao = 0;
    let totalFinal = 0;

    if (pontoParticipaDespesa) {
      // Participa: Líquido - Despesa, depois Comissão
      const liquidoAposDespesa = toSafeNumber(liquidoDaMaquina - despesa);
      valorComissao = liquidoAposDespesa > 0 ? toSafeNumber(liquidoAposDespesa * (comissaoPorcentagem / 100)) : 0;
      totalFinal = toSafeNumber(liquidoAposDespesa - valorComissao);
    } else {
      // Não participa: Comissão direto, sem despesa
      valorComissao = liquidoDaMaquina > 0 ? toSafeNumber(liquidoDaMaquina * (comissaoPorcentagem / 100)) : 0;
      totalFinal = toSafeNumber(liquidoDaMaquina - valorComissao);
    }

    return {
      ...novoDetalhe,
      totalEntrada,
      totalSaida,
      totalGeral: liquidoDaMaquina,
      valorComissao,
      totalFinal
    };
  };

  // Verificar se venda é do dia corrente
  const podeEditarVenda = (venda: any) => {
    return venda.data === getTodayDateString();
  };

  const onSubmit = async (data: Venda) => {
    if (!userProfile) return;

    // Validar localidade selecionada
    if (!selectedLocalidade) {
      setMessage('Por favor, selecione uma localidade antes de salvar a leitura.');
      setMessageType('error');
      return;
    }

    // Validar centro de custo se houver despesa
    if (data.despesa > 0 && !data.centroCustoId) {
      setMessage('Por favor, selecione um Centro de Custo para a despesa informada.');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      const operador = operadores.find(o => o.id === data.operadorId);

      // Garantir que a data é tratada corretamente (sem conversão UTC)
      // Se vier como string simples, mantém; se vier como outro formato, converte
      let dataFormatada = data.data;
      if (dataFormatada && dataFormatada.length > 10) {
        // Se vier em formato ISO (YYYY-MM-DDTHH:MM:SS), extrair apenas a data
        dataFormatada = dataFormatada.split('T')[0];
      }

      const payload = {
        ...data,
        data: dataFormatada, // Usar a data sanitizada
        pontoId: operador?.pontoId || '',
        rotaId: operador?.rotaId || '',
        fatorConversao: operador?.fatorConversao || 1,
        participaDespesa: selectedPonto?.participaDespesa ?? true,
        totalEntrada,
        totalSaida,
        totalGeral: liquidoDaMaquina, // Líquido da máquina (após fator)
        valorComissao,
        totalFinal, // Lucro líquido (após comissão e despesa)
        status_conferencia: 'pendente' as const,
        fotoUrl: '',
        userId: userProfile.uid,
        userName: userProfile.displayName || userProfile.name || userProfile.email || userProfile.uid,
        userDisplayName: userProfile.displayName || userProfile.name || userProfile.email || userProfile.uid,
        coletorId: userProfile.uid, // Registrar quem coletou
        coletorNome: userProfile.name, // Nome do coletor para relatórios
        localidadeId: selectedLocalidade,
        ...(data.centroCustoId ? { centroCustoId: data.centroCustoId } : {})
      };

      console.log('Salvando venda com payload:', payload, 'Data original:', data.data, 'Data formatada:', dataFormatada);

      await saveVenda(payload, userProfile.uid);
      setMessage('Leitura salva com sucesso!');
      setMessageType('success');
      handleCloseModal();
      loadVendas(); // Recarregar listagem

      // Limpar mensagem após 3s
      setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 3000);
    } catch (error: any) {
      setMessage(error.message || 'Erro ao salvar leitura');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const isColeta = userProfile?.role === 'coleta';
  const isAuthorized = userProfile && ['admin', 'gerente', 'coleta'].includes(userProfile.role);

  return (
    <>
      <div className="w-full">
        <PageHeader
          title="Lançamento de Leitura"
          subtitle="Registre leituras manuais de máquinas e operadores"
          action={
            isAuthorized ? (
              <ButtonPrimary
                onClick={handleOpenModal}
                className="flex items-center gap-2"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Nova Leitura</span>
                <span className="sm:hidden">+</span>
              </ButtonPrimary>
            ) : undefined
          }
        />

        {!isAuthorized && (
          <AlertBox
            type="warning"
            message={`Seu perfil (${userProfile?.role}) não possui permissão para lançar leituras.`}
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

        {/* Tabela de Leituras Cadastradas */}
        <GlassCard className="overflow-hidden">
          {/* Filtro por Data */}
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText size={20} />
              Leituras Cadastradas
              <span className="text-xs text-slate-500 font-normal ml-2">({vendas.filter(v => v.data === filtroData).length} hoje)</span>
            </h2>
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-slate-600">Filtrar por data:</label>
              <input
                type="date"
                value={filtroData}
                onChange={(e) => setFiltroData(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {loadingVendas ? (
            <div className="p-12 text-center">
              <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-slate-600">Carregando leituras...</p>
            </div>
          ) : vendas.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">Nenhuma leitura encontrada para esta localidade.</p>
              <p className="text-sm text-slate-400 mt-2">Clique em "Nova Leitura" para cadastrar a primeira leitura.</p>
              {!selectedLocalidade && (
                <p className="text-xs text-orange-600 mt-2">⚠️ Selecione uma localidade no topo da página</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80 border-b-2 border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-bold text-slate-600 uppercase tracking-tight sm:tracking-wide">Data</th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-bold text-slate-600 uppercase tracking-tight sm:tracking-wide hidden sm:table-cell">Ponto</th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-bold text-slate-600 uppercase tracking-tight sm:tracking-wide hidden md:table-cell">Operador</th>
                    <th className="px-2 sm:px-3 py-2 text-right text-xs font-bold text-slate-600 uppercase tracking-tight sm:tracking-wide">Total</th>
                    <th className="px-2 sm:px-3 py-2 text-right text-xs font-bold text-slate-600 uppercase tracking-tight sm:tracking-wide hidden lg:table-cell">Comissão</th>
                    <th className="px-2 sm:px-3 py-2 text-right text-xs font-bold text-slate-600 uppercase tracking-tight sm:tracking-wide hidden md:table-cell">Despesa</th>
                    <th className="px-2 sm:px-3 py-2 text-right text-xs font-bold text-slate-600 uppercase tracking-tight sm:tracking-wide">Final</th>
                    <th className="px-2 sm:px-3 py-2 text-center text-xs font-bold text-slate-600 uppercase tracking-tight sm:tracking-wide hidden sm:table-cell">Status</th>
                    <th className="px-2 sm:px-3 py-2 text-center text-xs font-bold text-slate-600 uppercase tracking-tight sm:tracking-wide">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendas
                    .map((v: any) => {
                      let dataVenda = v.data;
                      if (dataVenda && dataVenda.length > 10) {
                        dataVenda = dataVenda.split('T')[0];
                      }
                      return { ...v, data: dataVenda };
                    })
                    .filter(v => v.data === filtroData)
                    .map((venda) => {
                      const ponto = pontos.find(p => p.id === venda.pontoId);
                      const operador = operadores.find(o => o.id === venda.operadorId);

                      return (
                        <tr key={venda.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-2 py-1 whitespace-nowrap text-xs text-slate-700">
                            {venda.data ? venda.data.split('-').reverse().join('/') : '--'}
                          </td>
                          <td className="px-2 py-1 whitespace-nowrap text-xs text-slate-700 hidden sm:table-cell">
                            <span className="font-semibold">{ponto?.codigo}</span> {ponto?.nome || 'N/A'}
                          </td>
                          <td className="px-2 py-1 whitespace-nowrap text-xs text-slate-700 hidden md:table-cell">
                            <span className="font-semibold">{operador?.codigo}</span> {operador?.nome || 'N/A'}
                          </td>
                          <td className="px-2 py-1 whitespace-nowrap text-right font-mono font-semibold text-slate-900 text-xs">
                            R$ {(venda.totalGeral || 0).toFixed(2)}
                          </td>
                          <td className="px-2 py-1 whitespace-nowrap text-right font-mono text-yellow-700 font-semibold text-xs hidden lg:table-cell">
                            R$ {(venda.valorComissao || 0).toFixed(2)}
                          </td>
                          <td className="px-2 py-1 text-right text-xs hidden md:table-cell">
                            {venda.despesa > 0 ? (
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="font-mono text-orange-700 font-semibold text-xs">
                                  R$ {venda.despesa.toFixed(2)}
                                </span>
                                {venda.centroCustoId && (
                                  <span className="text-xs text-slate-500 max-w-[100px] truncate" title={centrosCusto.find(c => c.id === venda.centroCustoId)?.nome}>
                                    {centrosCusto.find(c => c.id === venda.centroCustoId)?.nome || 'N/A'}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="font-mono text-slate-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-2 py-1 whitespace-nowrap text-right font-mono font-bold text-blue-600 text-xs">
                            R$ {(venda.totalFinal || 0).toFixed(2)}
                          </td>
                          <td className="px-2 py-1 whitespace-nowrap text-center hidden sm:table-cell">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold ${venda.status_conferencia === 'conferido'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                              }`}>
                              {venda.status_conferencia === 'conferido' ? '✓' : '◐'}
                            </span>
                          </td>
                          <td className="px-2 py-1 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleAbrirDetalhe(venda)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 transition-colors text-xs font-semibold"
                              title="Detalhes"
                            >
                              <Eye size={14} />
                              <span className="hidden sm:inline">Ver</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Modal de Nova Leitura */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title="Nova Leitura"
        size="xl"
        actions={
          <>
            <ButtonSecondary onClick={handleCloseModal} disabled={loading}>
              Cancelar
            </ButtonSecondary>
            <ButtonPrimary
              type="submit"
              form="form-nova-leitura"
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </ButtonPrimary>
          </>
        }
      >

        <form id="form-nova-leitura" onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* Header Selection - Data, Rota, Ponto/Máquina - Responsivo */}
          <GlassCard className="p-3 sm:p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
              {/* Data */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">
                  Data <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  {...register('data', { required: 'Obrigatório' })}
                  disabled={!isAuthorized}
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50"
                />
              </div>

              {/* Rota */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">
                  1. Rota <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedRotaId}
                  onChange={(e) => setSelectedRotaId(e.target.value)}
                  disabled={!isAuthorized}
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50"
                >
                  <option value="">Selecione a rota...</option>
                  {rotas.map(rota => (
                    <option key={rota.id} value={rota.id}>
                      {rota.codigo} - {rota.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ponto de Venda */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">
                  2. Ponto {pontosFiltrados.length > 0 && `(${pontosFiltrados.length} disponíveis)`}
                  <span className="text-red-500"> *</span>
                </label>
                <select
                  value={selectedPontoId}
                  onChange={(e) => handlePontoChange(e.target.value)}
                  disabled={!isAuthorized || !selectedRotaId}
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50"
                >
                  <option value="">{!selectedRotaId ? 'Selecione uma rota primeiro' : 'Selecione o ponto...'}</option>
                  {pontosFiltrados.map(ponto => (
                    <option key={ponto.id} value={ponto.id}>
                      {ponto.codigo} - {ponto.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Operador/Máquina */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">
                  3. Máquina {operadoresFiltrados.length > 0 && `(${operadoresFiltrados.length} pendentes)`}
                  <span className="text-red-500"> *</span>
                </label>
                <select
                  {...register('operadorId', { required: 'Obrigatório' })}
                  onChange={handleOperadorChange}
                  disabled={!isAuthorized || !selectedPontoId}
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50"
                >
                  <option value="">{!selectedPontoId ? 'Selecione um ponto primeiro' : 'Selecione a máquina...'}</option>
                  {operadoresFiltrados.length === 0 && selectedPontoId ? (
                    <option disabled>✓ Todos lidos hoje</option>
                  ) : (
                    operadoresFiltrados.map(op => (
                      <option key={op.id} value={op.id}>
                        {op.codigo} - {op.nome}
                      </option>
                    ))
                  )}
                </select>
                {loadingHistory && <p className="text-xs text-blue-500 mt-1">Buscando...</p>}
              </div>
            </div>
          </GlassCard>

          {/* Counters Grid - Responsivo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {/* Entradas */}
            <div className="bg-green-50/30 border border-green-200 rounded-lg p-2 sm:p-3">
              <h3 className="text-xs font-bold text-green-700 mb-2">Entradas</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Anterior <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    {...register('entradaAnterior', { valueAsNumber: true })}
                    readOnly
                    className="w-full bg-slate-100 border border-slate-300 rounded px-2 py-1 text-slate-700 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Atual <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    {...register('entradaAtual', { valueAsNumber: true, required: 'Obrigatório' })}
                    disabled={!isAuthorized}
                    placeholder="0"
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:ring-2 focus:ring-green-500 outline-none disabled:bg-slate-50 font-mono"
                  />
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-green-300 flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-600">Total:</span>
                <span className="text-sm font-bold text-green-600">{totalEntrada.toFixed(0)}</span>
              </div>
            </div>

            {/* Saídas */}
            <div className="bg-red-50/30 border border-red-200 rounded-lg p-2 sm:p-3">
              <h3 className="text-xs font-bold text-red-700 mb-2">Saídas (Prêmios)</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Anterior <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    {...register('saidaAnterior', { valueAsNumber: true })}
                    readOnly
                    className="w-full bg-slate-100 border border-slate-300 rounded px-2 py-1 text-slate-700 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Atual <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    {...register('saidaAtual', { valueAsNumber: true, required: 'Obrigatório' })}
                    disabled={!isAuthorized}
                    placeholder="0"
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:ring-2 focus:ring-red-500 outline-none disabled:bg-slate-50 font-mono"
                  />
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-red-300 flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-600">Total:</span>
                <span className="text-sm font-bold text-red-600">{totalSaida.toFixed(0)}</span>
              </div>
            </div>
          </div>

          {/* Resumo Financeiro em Linha - Compacto */}
          {!isColeta && (
            <GlassCard className="p-3">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                {/* Entrada-Saída */}
                <div className="bg-blue-50 border border-blue-200 rounded p-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-0.5">Entrada-Saída</label>
                  <div className="text-sm font-bold font-mono text-blue-700">{entradaMenosSaida.toFixed(0)}</div>
                  <div className="text-xs text-slate-500">F: {fatorConversao}</div>
                </div>

                {/* Líquido da Máquina */}
                <div className="bg-slate-50 border border-slate-200 rounded p-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-0.5">Líquido</label>
                  <div className={`text-sm font-bold font-mono ${totalGeral < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                    R$ {totalGeral.toFixed(2)}
                  </div>
                </div>

                {/* % Ponto */}
                <div className="bg-slate-50 border border-slate-200 rounded p-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-0.5">% Ponto</label>
                  <input
                    type="number"
                    {...register('comissaoPorcentagem', { valueAsNumber: true })}
                    readOnly
                    disabled
                    className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 text-slate-900 text-xs font-mono font-bold"
                  />
                </div>

                {/* Comissão */}
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-0.5">Comissão</label>
                  <div className="text-sm font-bold font-mono text-yellow-700">
                    R$ {valorComissao.toFixed(2)}
                  </div>
                </div>

                {/* Despesa */}
                <div className="bg-slate-50 border border-slate-200 rounded p-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-0.5">💰 Despesa</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('despesa', { valueAsNumber: true })}
                    disabled={!isAuthorized}
                    placeholder="0"
                    className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 text-slate-900 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Centro de Custo - Aparece apenas se despesa > 0 */}
              {despesa > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded p-2 mb-3">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    🎯 Centro de Custo <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('centroCustoId', {
                      required: despesa > 0 ? 'Centro de Custo é obrigatório quando há despesa' : false
                    })}
                    disabled={!isAuthorized}
                    className="w-full bg-white border border-orange-300 rounded-lg px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none disabled:bg-slate-50"
                  >
                    <option value="">Selecione o centro de custo...</option>
                    {centrosCusto.map(centro => (
                      <option key={centro.id} value={centro.id}>
                        {centro.nome}
                      </option>
                    ))}
                  </select>
                  {centrosCusto.length === 0 && (
                    <p className="text-xs text-orange-600 mt-2">
                      ⚠️ Nenhum centro de custo cadastrado para esta localidade.
                      Vá em Financeiro → Despesas para cadastrar centros de custo.
                    </p>
                  )}
                </div>
              )}

              {/* Total Final (Caixa) em Destaque - Compacto */}
              <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-300 rounded p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-700">💰 Lucro Líquido</span>
                  <div className={`text-lg font-bold font-mono ${totalFinal < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    R$ {totalFinal.toFixed(2)}
                  </div>
                </div>
              </div>
            </GlassCard>
          )}

          {/* File Upload - Responsivo */}
          <div className="border border-dashed border-slate-300 rounded p-2 sm:p-3 bg-slate-50/50 hover:bg-slate-100/50 transition-colors cursor-pointer">
            <input
              type="file"
              accept="image/*"
              disabled={!isAuthorized}
              className="hidden"
              id="fileUpload"
            />
            <label htmlFor="fileUpload" className="cursor-pointer flex items-center justify-center gap-2">
              <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs text-slate-600">📷 Adicionar imagem (opcional)</span>
            </label>
          </div>

        </form>
      </Modal>

      {/* Modal de Detalhes / Edição */}
      {showDetalheModal && vendaSelecionada && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-slate-200 px-8 py-6 flex items-center justify-between z-10">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Detalhes da Leitura</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {new Date(vendaSelecionada.data).toLocaleDateString('pt-BR')} - {pontos.find(p => p.id === vendaSelecionada.pontoId)?.nome}
                </p>
              </div>
              <button
                onClick={handleFecharDetalhe}
                type="button"
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-8 space-y-6">
              {/* Informações Básicas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <label className="text-xs font-semibold text-slate-600">Ponto</label>
                  <p className="text-sm font-bold text-slate-900 mt-1">{pontos.find(p => p.id === vendaSelecionada.pontoId)?.nome}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <label className="text-xs font-semibold text-slate-600">Operador</label>
                  <p className="text-sm font-bold text-slate-900 mt-1">{operadores.find(o => o.id === vendaSelecionada.operadorId)?.nome}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <label className="text-xs font-semibold text-slate-600">Rota</label>
                  <p className="text-sm font-bold text-slate-900 mt-1">{rotasIndex?.[vendaSelecionada.rotaId]?.nome || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <label className="text-xs font-semibold text-slate-600">Fator</label>
                  <p className="text-sm font-bold text-slate-900 mt-1">{(vendaSelecionada.fatorConversao ?? 1).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <label className="text-xs font-semibold text-slate-600">Status</label>
                  <p className={`text-sm font-bold mt-1 ${vendaSelecionada.status_conferencia === 'conferido' ? 'text-green-600' : 'text-yellow-600'}`}>
                    {vendaSelecionada.status_conferencia === 'conferido' ? '✓ Conferido' : '⏳ Pendente'}
                  </p>
                </div>
              </div>

              {/* Entradas e Saídas */}
              {editandoDetalhe ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <label className="text-xs font-semibold text-green-700">Entrada Anterior</label>
                    <input
                      type="number"
                      value={detalheEditado.entradaAnterior}
                      readOnly
                      className="w-full text-2xl font-bold text-green-700 mt-2 bg-white border border-green-200 rounded px-2 py-1"
                    />
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <label className="text-xs font-semibold text-green-700">Entrada Atual</label>
                    <input
                      type="number"
                      value={detalheEditado.entradaAtual === 0 ? '' : detalheEditado.entradaAtual}
                      onChange={(e) => setDetalheEditado(recalcularValoresDetalhe({ ...detalheEditado, entradaAtual: parseFloat(e.target.value) || 0 }))}
                      placeholder="Informe a entrada atual"
                      className="w-full text-2xl font-bold text-green-700 mt-2 bg-white border border-green-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <label className="text-xs font-semibold text-red-700">Saída Anterior</label>
                    <input
                      type="number"
                      value={detalheEditado.saidaAnterior}
                      readOnly
                      className="w-full text-2xl font-bold text-red-700 mt-2 bg-white border border-red-200 rounded px-2 py-1"
                    />
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <label className="text-xs font-semibold text-red-700">Saída Atual</label>
                    <input
                      type="number"
                      value={detalheEditado.saidaAtual === 0 ? '' : detalheEditado.saidaAtual}
                      onChange={(e) => setDetalheEditado(recalcularValoresDetalhe({ ...detalheEditado, saidaAtual: parseFloat(e.target.value) || 0 }))}
                      placeholder="Informe a saída atual"
                      className="w-full text-2xl font-bold text-red-700 mt-2 bg-white border border-red-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <label className="text-xs font-semibold text-green-700">Entrada Anterior</label>
                    <p className="text-2xl font-bold text-green-700 mt-2">{vendaSelecionada.entradaAnterior}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <label className="text-xs font-semibold text-green-700">Entrada Atual</label>
                    <p className="text-2xl font-bold text-green-700 mt-2">{vendaSelecionada.entradaAtual}</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <label className="text-xs font-semibold text-red-700">Saída Anterior</label>
                    <p className="text-2xl font-bold text-red-700 mt-2">{vendaSelecionada.saidaAnterior}</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <label className="text-xs font-semibold text-red-700">Saída Atual</label>
                    <p className="text-2xl font-bold text-red-700 mt-2">{vendaSelecionada.saidaAtual}</p>
                  </div>
                </div>
              )}

              {/* Cálculos Financeiros */}
              {editandoDetalhe ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <label className="text-xs font-semibold text-slate-600">Total Geral (calculado)</label>
                    <p className="text-lg font-bold text-blue-700 mt-1">R$ {(detalheEditado.totalGeral || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <label className="text-xs font-semibold text-slate-600">Comissão %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={detalheEditado.comissaoPorcentagem}
                      readOnly
                      className="w-full text-lg font-bold text-yellow-700 mt-1 bg-slate-100 border border-yellow-200 rounded px-2 py-1 cursor-not-allowed opacity-60"
                    />
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <label className="text-xs font-semibold text-slate-600">Comissão (calculada)</label>
                    <p className="text-lg font-bold text-yellow-700 mt-1">R$ {(detalheEditado.valorComissao || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <label className="text-xs font-semibold text-slate-600">Despesa</label>
                    <input
                      type="number"
                      step="0.01"
                      value={detalheEditado.despesa}
                      onChange={(e) => setDetalheEditado(recalcularValoresDetalhe({ ...detalheEditado, despesa: parseFloat(e.target.value) || 0 }))}
                      className="w-full text-lg font-bold text-orange-700 mt-1 bg-white border border-orange-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className={`bg-emerald-50 rounded-lg p-4 border-2 border-emerald-200 md:col-span-2 ${(detalheEditado.totalFinal || 0) < 0 ? 'border-red-300 bg-red-50' : ''
                    }`}>
                    <label className="text-xs font-semibold text-slate-600">Lucro Líquido (calculado)</label>
                    <p className={`text-lg font-bold mt-1 ${(detalheEditado.totalFinal || 0) < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                      R$ {(detalheEditado.totalFinal || 0).toFixed(2)}{(detalheEditado.totalFinal || 0) < 0 ? ' (negativo)' : ''}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <label className="text-xs font-semibold text-slate-600">Total Geral</label>
                    <p className="text-lg font-bold text-blue-700 mt-1">R$ {(vendaSelecionada.totalGeral || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <label className="text-xs font-semibold text-slate-600">Comissão</label>
                    <p className="text-lg font-bold text-yellow-700 mt-1">R$ {(vendaSelecionada.valorComissao || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <label className="text-xs font-semibold text-slate-600">Despesa</label>
                    <p className="text-lg font-bold text-orange-700 mt-1">R$ {(vendaSelecionada.despesa || 0).toFixed(2)}</p>
                  </div>
                  <div className={`bg-emerald-50 rounded-lg p-4 border-2 border-emerald-200 ${(vendaSelecionada.totalFinal || 0) < 0 ? 'border-red-300 bg-red-50' : ''
                    }`}>
                    <label className="text-xs font-semibold text-slate-600">Lucro Líquido</label>
                    <p className={`text-lg font-bold mt-1 ${(vendaSelecionada.totalFinal || 0) < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                      R$ {(vendaSelecionada.totalFinal || 0).toFixed(2)}{(vendaSelecionada.totalFinal || 0) < 0 ? ' (negativo)' : ''}
                    </p>
                  </div>
                </div>
              )}

              {/* Centro de Custo se houver despesa */}
              {editandoDetalhe ? (
                detalheEditado.despesa > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <label className="text-sm font-semibold text-orange-900">Centro de Custo</label>
                    <select
                      value={detalheEditado.centroCustoId}
                      onChange={(e) => setDetalheEditado({ ...detalheEditado, centroCustoId: e.target.value })}
                      className="w-full mt-2 px-3 py-2 bg-white border border-orange-200 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-orange-900 font-semibold"
                    >
                      <option value="">Selecionar...</option>
                      {centrosCusto.map((cc) => (
                        <option key={cc.id} value={cc.id}>
                          {cc.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              ) : (
                vendaSelecionada.despesa > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <label className="text-sm font-semibold text-orange-900">Centro de Custo</label>
                    <p className="text-base font-bold text-orange-900 mt-2">{centrosCusto.find(c => c.id === vendaSelecionada.centroCustoId)?.nome || 'Não informado'}</p>
                  </div>
                )
              )}

              {/* Info Auditoria */}
              <div className="bg-slate-100 rounded-lg p-4 text-xs text-slate-600 space-y-1">
                <p>
                  <strong>Usuário:</strong>{' '}
                  {vendaSelecionada.userName || vendaSelecionada.userDisplayName || vendaSelecionada.userId}
                </p>
                <p><strong>Data da leitura:</strong> {new Date(vendaSelecionada.data).toLocaleDateString('pt-BR')}</p>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-3 justify-end pt-4">
                <button
                  onClick={handleFecharDetalhe}
                  type="button"
                  className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors"
                >
                  Fechar
                </button>
                {podeEditarVenda(vendaSelecionada) && (
                  <button
                    onClick={() => {
                      if (!editandoDetalhe) {
                        const operadorDaVenda = operadores.find(op => op.id === vendaSelecionada.operadorId);
                        setDetalheEditado({
                          ...vendaSelecionada,
                          fatorConversao: vendaSelecionada.fatorConversao ?? operadorDaVenda?.fatorConversao ?? 1
                        });
                      }
                      setEditandoDetalhe(!editandoDetalhe);
                    }}
                    type="button"
                    className={`px-6 py-2.5 font-semibold rounded-lg transition-colors flex items-center gap-2 ${editandoDetalhe
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-amber-500 hover:bg-amber-600 text-white'
                      }`}
                  >
                    <Edit2 size={16} />
                    {editandoDetalhe ? 'Cancelar Edição' : 'Editar'}
                  </button>
                )}
                {editandoDetalhe && (
                  <button
                    onClick={handleSalvarEdicaoDetalhe}
                    type="button"
                    disabled={loadingSalvarDetalhe}
                    className="px-6 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-green-400 text-white font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    {loadingSalvarDetalhe ? 'Salvando...' : 'Salvar'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LancamentoManual;