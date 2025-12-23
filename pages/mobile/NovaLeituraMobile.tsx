import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, addDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { db, storage } from '../../services/firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { formatCurrency } from '../../utils/formatters';
import { compressImage } from '../../utils/compressor';
import { Camera, Upload, CheckCircle, Loader2 } from 'lucide-react';
import { NumericFormat } from 'react-number-format';
import { Operador, Ponto, Rota, CentroCusto } from '../../types';

interface PontoComRegras extends Ponto {
  comissao?: number;
  participaDespesa?: boolean;
}

const NovaLeituraMobile: React.FC = () => {
  const { userProfile } = useAuth();

  // Estados de listas
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [operadoresFiltrados, setOperadoresFiltrados] = useState<Operador[]>([]);
  const [pontos, setPontos] = useState<PontoComRegras[]>([]);
  const [pontosFiltrados, setPontosFiltrados] = useState<PontoComRegras[]>([]);
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingUltimaLeitura, setLoadingUltimaLeitura] = useState(false);

  // Estados do formulário
  const [operadorId, setOperadorId] = useState('');
  const [pontoId, setPontoId] = useState('');
  const [rotaId, setRotaId] = useState('');
  const [centroCustoId, setCentroCustoId] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);

  const [entradaAnterior, setEntradaAnterior] = useState('');
  const [entradaAtual, setEntradaAtual] = useState('');
  const [saidaAnterior, setSaidaAnterior] = useState('');
  const [saidaAtual, setSaidaAtual] = useState('');
  const [despesa, setDespesa] = useState('');
  const [comissaoPorcentagem, setComissaoPorcentagem] = useState('10');
  const [fatorConversao, setFatorConversao] = useState<number>(1);

  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [participaDespesa, setParticipaDespesa] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const isSubmittingRef = React.useRef(false);

  // Helper para evitar NaN
  const toSafeNumber = (val: any) => {
    const n = Number(val ?? 0);
    return Number.isFinite(n) ? n : 0;
  };

  // Cálculos automáticos usando useMemo para evitar re-renders infinitos
  const calculosFinanceiros = useMemo(() => {
    const totalEntrada = toSafeNumber(Number(entradaAtual) - Number(entradaAnterior));
    const totalSaida = toSafeNumber(Number(saidaAtual) - Number(saidaAnterior));
    const entradaMenosSaida = toSafeNumber(totalEntrada - totalSaida);

    // Aplicar fator de conversão
    const liquidoDaMaquina = toSafeNumber(entradaMenosSaida * fatorConversao);

    // Calcular comissão e lucro baseado na regra do ponto
    let valorComissao = 0;
    let totalFinal = 0;

    if (participaDespesa) {
      // Participa: Líquido - Despesa, depois Comissão
      const liquidoAposDespesa = toSafeNumber(liquidoDaMaquina - Number(despesa || 0));
      valorComissao = liquidoAposDespesa > 0 ? toSafeNumber(liquidoAposDespesa * (Number(comissaoPorcentagem) / 100)) : 0;
      totalFinal = toSafeNumber(liquidoAposDespesa - valorComissao);
    } else {
      // Não participa: Comissão direto, sem despesa
      valorComissao = liquidoDaMaquina > 0 ? toSafeNumber(liquidoDaMaquina * (Number(comissaoPorcentagem) / 100)) : 0;
      totalFinal = toSafeNumber(liquidoDaMaquina - valorComissao);
    }

    return {
      totalEntrada,
      totalSaida,
      entradaMenosSaida,
      liquidoDaMaquina,
      valorComissao,
      totalFinal
    };
  }, [entradaAtual, entradaAnterior, saidaAtual, saidaAnterior, fatorConversao, participaDespesa, despesa, comissaoPorcentagem]);

  // Desestruturar para usar nas variáveis
  const { totalEntrada, totalSaida, entradaMenosSaida, liquidoDaMaquina, valorComissao, totalFinal } = calculosFinanceiros;

  // Carregar dados do Firestore
  useEffect(() => {
    const loadData = async () => {
      if (!userProfile?.allowedLocalidades?.[0]) return;

      setLoadingData(true);
      try {
        const localidadeId = userProfile.allowedLocalidades[0];

        // Carregar todas as rotas ativas
        const rotasQuery = query(
          collection(db, 'rotas'),
          where('localidadeId', '==', localidadeId),
          where('active', '==', true)
        );
        const rotasSnap = await getDocs(rotasQuery);
        const rotasData = rotasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rota));
        setRotas(rotasData);

        // Carregar todos os pontos ativos (para filtrar depois)
        const pontosQuery = query(
          collection(db, 'pontos'),
          where('localidadeId', '==', localidadeId),
          where('active', '==', true)
        );
        const pontosSnap = await getDocs(pontosQuery);
        const pontosData = pontosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PontoComRegras));
        setPontos(pontosData);

        // Carregar todos os operadores ativos (para filtrar depois)
        const operadoresQuery = query(
          collection(db, 'operadores'),
          where('localidadeId', '==', localidadeId),
          where('active', '==', true)
        );
        const operadoresSnap = await getDocs(operadoresQuery);
        const operadoresData = operadoresSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Operador));
        setOperadores(operadoresData);

        // Carregar centros de custo
        const ccQuery = query(
          collection(db, 'centrosCusto'),
          where('localidadeId', '==', localidadeId),
          where('active', '==', true)
        );
        const ccSnap = await getDocs(ccQuery);
        const ccData = ccSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CentroCusto));
        setCentrosCusto(ccData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setMensagem('❌ Erro ao carregar dados');
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [userProfile]);

  // Filtrar pontos quando rota é selecionada
  useEffect(() => {
    if (rotaId) {
      const pontosDaRota = pontos.filter(p => p.rotaId === rotaId);
      setPontosFiltrados(pontosDaRota);
      setPontoId(''); // Limpa ponto selecionado
      setOperadorId(''); // Limpa operador selecionado
    } else {
      setPontosFiltrados([]);
      setPontoId('');
      setOperadorId('');
    }
  }, [rotaId, pontos]);

  // Buscar participaDespesa quando ponto é selecionado
  useEffect(() => {
    if (pontoId) {
      const pontoSelecionado = pontos.find(p => p.id === pontoId);
      if (pontoSelecionado) {
        setParticipaDespesa(pontoSelecionado.participaDespesa ?? true);
        setComissaoPorcentagem(String(pontoSelecionado.comissao || 10));
      }
    }
  }, [pontoId, pontos]);

  // Filtrar operadores quando ponto é selecionado e remover já lidos hoje
  useEffect(() => {
    const loadOperadoresDoPonto = async () => {
      if (!pontoId) {
        setOperadoresFiltrados([]);
        return;
      }

      try {
        // Buscar operadores do ponto
        const operadoresDoPonto = operadores.filter(op => op.pontoId === pontoId);

        // Buscar leituras de hoje
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const vendasHojeQuery = query(
          collection(db, 'vendas'),
          where('pontoId', '==', pontoId),
          where('data', '==', new Date().toISOString().split('T')[0])
        );
        const vendasSnap = await getDocs(vendasHojeQuery);
        const operadoresLidosHoje = vendasSnap.docs.map(doc => doc.data().operadorId);

        // Filtrar operadores não lidos hoje
        const operadoresPendentes = operadoresDoPonto.filter(
          op => !operadoresLidosHoje.includes(op.id)
        );

        setOperadoresFiltrados(operadoresPendentes);
      } catch (error) {
        console.error('Erro ao filtrar operadores:', error);
      }
    };

    loadOperadoresDoPonto();
  }, [pontoId, operadores]);

  // Buscar última leitura quando operador é selecionado
  useEffect(() => {
    const buscarUltimaLeitura = async () => {
      if (!operadorId) return;

      setLoadingUltimaLeitura(true);
      try {
        // Buscar fator de conversão do operador
        const operadorSelecionado = operadores.find(op => op.id === operadorId);
        if (operadorSelecionado?.fatorConversao) {
          setFatorConversao(operadorSelecionado.fatorConversao);
        } else {
          setFatorConversao(1);
        }

        const ultimaLeituraQuery = query(
          collection(db, 'vendas'),
          where('operadorId', '==', operadorId),
          where('active', '==', true)
        );
        const snapshot = await getDocs(ultimaLeituraQuery);

        if (!snapshot.empty) {
          // Ordenar por timestamp e pegar a mais recente
          const vendas = snapshot.docs.map(doc => doc.data());
          vendas.sort((a: any, b: any) => {
            const timeA = a.timestamp?.toMillis() || 0;
            const timeB = b.timestamp?.toMillis() || 0;
            return timeB - timeA;
          });

          const ultima = vendas[0];
          // Preencher campos "Anterior" com valores "Atual" da última leitura
          setEntradaAnterior(String(ultima.entradaAtual || 0));
          setSaidaAnterior(String(ultima.saidaAtual || 0));
        } else {
          // Primeira leitura - zerar campos
          setEntradaAnterior('0');
          setSaidaAnterior('0');
        }
      } catch (error) {
        console.error('Erro ao buscar última leitura:', error);
      } finally {
        setLoadingUltimaLeitura(false);
      }
    };

    buscarUltimaLeitura();
  }, [operadorId]);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Bloqueia se já estiver enviando (proteção contra duplo clique/enter)
    if (loading || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setLoading(true);
    setMensagem('');

    try {
      console.log('Iniciando submit...', { operadorId, pontoId, rotaId, foto: !!foto });

      // Validações
      if (!operadorId || !pontoId || !rotaId) {
        setMensagem('❌ Preencha todos os campos obrigatórios!');
        setLoading(false);
        return;
      }

      if (!entradaAtual || !saidaAtual) {
        setMensagem('❌ Preencha as leituras atuais!');
        setLoading(false);
        return;
      }

      console.log('Validações OK. Salvando no Firestore...');

      // Processar foto se existir (com compressão)
      let fotoUrl = '';
      if (foto) {
        try {
          setMensagem('⏳ Preparando imagem...');
          console.log('[DEBUG] Foto original:', { name: foto.name, size: foto.size, type: foto.type });

          setMensagem('⏳ Comprimindo...');
          const compressedBlob = await compressImage(foto);

          // Garantir que temos um objeto File com nome válido para o Storage
          // browser-image-compression às vezes retorna um Blob puro sem o nome original
          const fileName = foto.name ? `compressed_${foto.name}` : `foto_${Date.now()}.jpg`;
          const compressedFile = new File([compressedBlob], fileName, { type: 'image/jpeg' });

          setMensagem('⏳ Enviando ao servidor...');
          console.log(`[DEBUG] Upload iniciando: ${fileName} (${(compressedFile.size / 1024).toFixed(2)} KB)`);

          const storagePath = `leituras/${userProfile?.uid || 'anonimo'}/${Date.now()}_${fileName}`;
          console.log(`[DEBUG] Upload iniciando no path: ${storagePath}`);
          const storageRef = ref(storage, storagePath);

          const uploadResult = await uploadBytes(storageRef, compressedFile);
          fotoUrl = await getDownloadURL(uploadResult.ref);

          console.log('[DEBUG] Upload finalizado com sucesso:', fotoUrl);
        } catch (err: any) {
          console.error('[DEBUG] FALHA NO UPLOAD:', {
            message: err.message,
            code: err.code,
            name: err.name,
            stack: err.stack
          });

          const erroMsg = err.message?.toLowerCase().includes('permission')
            ? 'Erro: Sem permissão no Storage'
            : 'Erro no envio da foto';

          setMensagem(`⚠️ ${erroMsg}`);
          // Pausa para o usuário ver o erro antes de seguir para o salvamento
          await new Promise(resolve => setTimeout(resolve, 2500));
        }
      }

      setMensagem('⏳ Salvando leitura no banco...');

      // Salvar leitura no Firestore
      const vendaData = {
        data,
        timestamp: Timestamp.now(),
        operadorId,
        pontoId,
        rotaId,
        localidadeId: userProfile?.allowedLocalidades[0] || '',
        entradaAnterior: Number(entradaAnterior),
        entradaAtual: Number(entradaAtual),
        totalEntrada,
        saidaAnterior: Number(saidaAnterior),
        saidaAtual: Number(saidaAtual),
        totalSaida,
        totalGeral: liquidoDaMaquina, // Campo obrigatório: entrada - saída após conversão
        entradaMenosSaida,
        fatorConversao,
        liquidoDaMaquina,
        participaDespesa,
        comissaoPorcentagem: Number(comissaoPorcentagem),
        valorComissao,
        despesa: Number(despesa || 0),
        centroCustoId: Number(despesa || 0) > 0 ? centroCustoId : '',
        totalFinal,
        status_conferencia: 'pendente' as const,
        fotoUrl,
        userId: userProfile?.uid || '',
        coletorId: userProfile?.uid || '',
        coletorNome: userProfile?.name || userProfile?.email || '',
        active: true,
      };

      console.log('📝 Dados a salvar:', { coletorId: vendaData.coletorId, timestamp: vendaData.timestamp });
      await addDoc(collection(db, 'vendas'), vendaData);

      console.log('✅ Leitura salva com sucesso!');
      setMensagem('✅ Leitura salva! Pronto para próxima...');
      setIsSuccess(true);
      setShowToast(true);

      // Resetar TODOS os campos para próxima leitura
      setTimeout(() => {
        setShowToast(false);
      }, 2000);

      setTimeout(() => {
        setRotaId('');
        setPontoId('');
        setOperadorId('');
        setEntradaAnterior('');
        setEntradaAtual('');
        setSaidaAnterior('');
        setSaidaAtual('');
        setDespesa('');
        setCentroCustoId('');
        setComissaoPorcentagem('10');
        setFatorConversao(1);
        setParticipaDespesa(true);
        setFoto(null);
        setFotoPreview('');
        setMensagem('');
        setPontosFiltrados([]);
        setOperadoresFiltrados([]);
        // Scroll suave para o topo
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 1500);

    } catch (error: any) {
      console.error('Erro ao salvar leitura:', error);
      setMensagem(`❌ Erro: ${error.message || 'Tente novamente'}`);
      setIsSuccess(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full animate-ping opacity-20"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                <Loader2 className="animate-spin text-white" size={36} />
              </div>
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">GesLeitura</h3>
          <p className="text-gray-600 font-medium animate-pulse">Carregando dados...</p>
          <div className="mt-4 flex justify-center gap-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 p-2 pb-20">
      <form onSubmit={handleSubmit} className="space-y-2 max-w-md mx-auto">
        {/* Identificação */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-2.5 rounded-xl border border-blue-200">
          <h2 className="font-bold text-sm mb-2 text-blue-900">📍 Identificação</h2>

          <div className="grid grid-cols-2 gap-1.5">
            {/* Coluna Esquerda: DATA e PONTO */}
            <div className="space-y-1.5">
              <div>
                <label className="block text-[10px] font-semibold text-gray-700 mb-0.5 uppercase tracking-wide">Data</label>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full p-1.5 border-2 border-blue-300 rounded-lg text-xs font-semibold bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-700 mb-0.5 uppercase tracking-wide">Ponto</label>
                <select
                  value={pontoId}
                  onChange={(e) => setPontoId(e.target.value)}
                  className="w-full p-1.5 border-2 border-blue-300 rounded-lg text-xs font-semibold bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  required
                  disabled={!rotaId || loadingData}
                >
                  <option value="">
                    {!rotaId ? 'Selecione rota' : 'Selecione'}
                  </option>
                  {pontosFiltrados.map(pt => (
                    <option key={pt.id} value={pt.id}>
                      {pt.codigo} - {pt.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Coluna Direita: ROTA e MÁQUINA */}
            <div className="space-y-1.5">
              <div>
                <label className="block text-[10px] font-semibold text-gray-700 mb-0.5 uppercase tracking-wide">Rota</label>
                <select
                  value={rotaId}
                  onChange={(e) => setRotaId(e.target.value)}
                  className="w-full p-1.5 border-2 border-blue-300 rounded-lg text-xs font-semibold bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  required
                  disabled={loadingData}
                >
                  <option value="">Selecione</option>
                  {rotas.map(rt => (
                    <option key={rt.id} value={rt.id}>
                      {rt.codigo} - {rt.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-700 mb-0.5 uppercase tracking-wide">
                  Máquina {operadoresFiltrados.length > 0 && `(${operadoresFiltrados.length})`}
                </label>
                <select
                  value={operadorId}
                  onChange={(e) => setOperadorId(e.target.value)}
                  className="w-full p-1.5 border-2 border-blue-300 rounded-lg text-xs font-semibold bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  required
                  disabled={!pontoId || loadingData}
                >
                  <option value="">
                    {!pontoId ? 'Selecione ponto' : 'Selecione'}
                  </option>
                  {operadoresFiltrados.map(op => (
                    <option key={op.id} value={op.id}>
                      {op.codigo} - {op.nome}
                    </option>
                  ))}
                </select>
                {loadingUltimaLeitura && (
                  <p className="text-[10px] text-blue-600 mt-0.5 flex items-center gap-1">
                    <Loader2 size={10} className="animate-spin" />
                    Carregando...
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Leituras */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-2.5 rounded-xl border border-blue-200 shadow-sm">
          <h2 className="font-bold text-sm mb-2 text-blue-900 flex items-center gap-1.5">
            <span className="text-base">🔢</span> Leituras
          </h2>

          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase tracking-wide flex items-center gap-1">
                <span>⬇️</span> Entrada Ant.
              </label>
              <input
                type="number"
                value={entradaAnterior}
                onChange={(e) => setEntradaAnterior(e.target.value)}
                className="w-full p-1.5 border border-gray-300 rounded-lg text-xs font-mono bg-gray-100 text-gray-500"
                placeholder="0"
                min="0"
                step="0.01"
                readOnly
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-green-700 mb-0.5 uppercase tracking-wide flex items-center gap-1">
                <span>⬇️</span> Entrada Atual
              </label>
              <NumericFormat
                value={entradaAtual}
                onValueChange={(values) => setEntradaAtual(values.value)}
                thousandSeparator="."
                decimalSeparator=","
                decimalScale={2}
                fixedDecimalScale={false}
                allowNegative={false}
                className="w-full p-1.5 border-2 border-green-400 rounded-lg text-xs font-mono font-bold bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none"
                placeholder="0"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase tracking-wide flex items-center gap-1">
                <span>⬆️</span> Saída Ant.
              </label>
              <input
                type="number"
                value={saidaAnterior}
                onChange={(e) => setSaidaAnterior(e.target.value)}
                className="w-full p-1.5 border border-gray-300 rounded-lg text-xs font-mono bg-gray-100 text-gray-500"
                placeholder="0"
                readOnly
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-red-700 mb-0.5 uppercase tracking-wide flex items-center gap-1">
                <span>⬆️</span> Saída Atual
              </label>
              <NumericFormat
                value={saidaAtual}
                onValueChange={(values) => setSaidaAtual(values.value)}
                thousandSeparator="."
                decimalSeparator=","
                decimalScale={2}
                fixedDecimalScale={false}
                allowNegative={false}
                className="w-full p-1.5 border-2 border-red-400 rounded-lg text-xs font-mono font-bold bg-white focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none"
                placeholder="0"
                required
              />
            </div>
          </div>

          {/* Totais Calculados - MELHORADO */}
          <div className="mt-2 p-2.5 bg-gradient-to-br from-white to-blue-50 rounded-xl border-2 border-blue-300 shadow-sm">
            <div className="flex justify-between text-xs mb-1 items-center">
              <span className="text-gray-600 flex items-center gap-1">
                <span className="text-green-500">▲</span> Total Entrada:
              </span>
              <span className="font-bold text-green-600 text-sm">R$ {formatCurrency(totalEntrada)}</span>
            </div>
            <div className="flex justify-between text-xs mb-1 items-center">
              <span className="text-gray-600 flex items-center gap-1">
                <span className="text-red-500">▼</span> Total Saída:
              </span>
              <span className="font-bold text-red-600 text-sm">R$ {formatCurrency(totalSaida)}</span>
            </div>
            <div className="flex justify-between text-xs mb-1 items-center">
              <span className="text-gray-600 flex items-center gap-1">
                <span className="text-purple-500">↔️</span> Entrada - Saída:
              </span>
              <span className="font-bold text-purple-600 text-sm">R$ {formatCurrency(entradaMenosSaida)}</span>
            </div>
            {fatorConversao !== 1 && (
              <div className="flex justify-between text-xs mb-1 text-blue-700 items-center">
                <span className="flex items-center gap-1">
                  <span>×</span> Fator ({fatorConversao}):
                </span>
                <span className="font-bold text-sm">R$ {formatCurrency(liquidoDaMaquina)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold border-t-2 border-blue-300 pt-1.5 mt-1.5 bg-gradient-to-r from-blue-50 to-transparent -mx-2.5 -mb-2.5 px-2.5 pb-2.5 rounded-b-xl">
              <span className="text-gray-800 flex items-center gap-1">
                <span className="text-blue-600">📊</span> Líquido Máquina:
              </span>
              <span className="text-blue-700 text-base">R$ {formatCurrency(liquidoDaMaquina)}</span>
            </div>
          </div>
        </div>

        {/* Financeiro */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-2.5 rounded-xl border border-green-200">
          <h2 className="font-bold text-sm mb-2 text-green-900">💰 Financeiro</h2>

          <div className="space-y-1.5">
            {/* Cards Positivos e Negativos - MOVIDOS PARA CIMA */}
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div className="bg-gradient-to-br from-green-100 to-green-50 border-2 border-green-300 rounded-lg p-2 shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md">
                <div className="text-green-800 font-bold mb-1.5 flex items-center gap-1">
                  <span className="text-sm">✓</span> Positivos
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-green-700">Entrada:</span>
                    <span className="font-bold text-green-800">R$ {formatCurrency(totalEntrada)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Líquido:</span>
                    <span className="font-bold text-green-800">R$ {formatCurrency(liquidoDaMaquina)}</span>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-red-100 to-red-50 border-2 border-red-300 rounded-lg p-2 shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md">
                <div className="text-red-800 font-bold mb-1.5 flex items-center gap-1">
                  <span className="text-sm">✗</span> Negativos
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-red-700">Saída:</span>
                    <span className="font-bold text-red-800">R$ {formatCurrency(totalSaida)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-700">Despesa:</span>
                    <span className="font-bold text-red-800">R$ {formatCurrency(Number(despesa || 0))}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Campo Despesas - MOVIDO PARA BAIXO */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-700 mb-0.5 uppercase tracking-wide">Despesas (R$)</label>
              <NumericFormat
                value={despesa}
                onValueChange={(values) => setDespesa(values.value)}
                thousandSeparator="."
                decimalSeparator=","
                decimalScale={2}
                fixedDecimalScale={false}
                allowNegative={false}
                className="w-full p-1.5 border-2 border-orange-300 rounded-lg text-xs font-semibold focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                placeholder="0,00"
              />

              {Number(despesa) > 0 && (
                <div className="mt-2 animate-in slide-in-from-top-2 duration-300">
                  <label className="block text-[10px] font-semibold text-gray-700 mb-0.5 uppercase tracking-wide">Centro de Custo</label>
                  <select
                    value={centroCustoId}
                    onChange={(e) => setCentroCustoId(e.target.value)}
                    className="w-full p-1.5 border-2 border-orange-300 rounded-lg text-xs font-semibold bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                  >
                    <option value="">Selecione...</option>
                    {centrosCusto.map(cc => (
                      <option key={cc.id} value={cc.id || ''}>{cc.nome}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Informações Compactas - SÓ VALORES */}
            <div className="flex justify-around text-[10px] text-gray-700 bg-white/60 py-1 px-2 rounded-lg border border-gray-200">
              <span>Comissão: <strong className="text-blue-700">{comissaoPorcentagem}%</strong></span>
              <span className="text-gray-300">|</span>
              <span>Fator: <strong className="text-purple-700">×{fatorConversao}</strong></span>
            </div>

            {/* Resumo Final */}
            <div className="p-2 bg-white rounded-lg border-2 border-green-300 shadow-sm">
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-gray-600">Comissão:</span>
                <span className="font-bold text-orange-600">- R$ {formatCurrency(valorComissao)}</span>
              </div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-gray-600">Despesas:</span>
                <span className="font-bold text-orange-600">- R$ {formatCurrency(Number(despesa || 0))}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t-2 border-green-200 pt-1 mt-1">
                <span className="text-gray-800">Total Final:</span>
                <span className="text-green-700">R$ {formatCurrency(totalFinal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Foto da Leitura */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-2.5 rounded-xl border border-purple-200">
          <h2 className="font-bold text-sm mb-2 text-purple-900 flex items-center gap-1.5">
            <Camera size={16} /> Foto da Leitura
          </h2>

          <div className="flex items-center gap-3">
            <label className="flex-1 flex flex-col items-center justify-center h-14 border-2 border-dashed border-purple-300 rounded-lg bg-white cursor-pointer hover:bg-purple-50 transition-colors relative overflow-hidden">
              {fotoPreview ? (
                <img
                  src={fotoPreview}
                  alt="Preview"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="text-center flex items-center gap-2">
                  <Camera className="text-purple-400" size={18} />
                  <span className="text-[10px] font-medium text-purple-600">Tirar Foto</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFotoChange}
                className="hidden"
              />
            </label>

            {fotoPreview && (
              <button
                type="button"
                onClick={() => {
                  setFoto(null);
                  setFotoPreview('');
                }}
                className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors"
                title="Remover foto"
              >
                <span className="text-xs font-bold">✕</span>
              </button>
            )}
          </div>
        </div>

        {/* Toast Animado de Sucesso/Erro */}
        {mensagem && (
          <div className={`fixed top-4 left-4 right-4 z-50 transform transition-all duration-500 ${showToast ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
            }`}>
            <div className={`p-4 rounded-2xl text-center font-bold shadow-2xl backdrop-blur-sm border-2 ${mensagem.includes('✅')
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-green-300'
              : 'bg-gradient-to-r from-red-500 to-rose-500 text-white border-red-300'
              } animate-bounce`}>
              <div className="flex items-center justify-center gap-2">
                {mensagem.includes('✅') ? (
                  <CheckCircle size={24} className="animate-pulse" />
                ) : (
                  <span className="text-2xl">❌</span>
                )}
                <span>{mensagem}</span>
              </div>
            </div>
          </div>
        )}

        {/* Botão de Envio com Micro-interações */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3.5 rounded-xl text-white text-base font-extrabold shadow-lg transition-all duration-300 transform ${loading
            ? 'bg-gradient-to-r from-gray-300 to-gray-400 opacity-70 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 hover:scale-105 hover:shadow-2xl hover:-translate-y-0.5'
            }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="animate-spin" size={20} />
              <span className="animate-pulse">Salvando...</span>
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-bounce">💾</span>
              Salvar Leitura
            </span>
          )}
        </button>
      </form>
    </div>
  );
};

export default NovaLeituraMobile;
