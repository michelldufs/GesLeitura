import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, addDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { Camera, Upload, CheckCircle, Loader2 } from 'lucide-react';
import { Operador, Ponto, Rota } from '../../types';

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
  const [loadingData, setLoadingData] = useState(true);
  const [loadingUltimaLeitura, setLoadingUltimaLeitura] = useState(false);
  
  // Estados do formulário
  const [operadorId, setOperadorId] = useState('');
  const [pontoId, setPontoId] = useState('');
  const [rotaId, setRotaId] = useState('');
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

      // Foto desativada temporariamente para reduzir custos
      const fotoUrl = foto ? 'foto_pendente' : '';

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
        entradaMenosSaida,
        fatorConversao,
        liquidoDaMaquina,
        participaDespesa,
        comissaoPorcentagem: Number(comissaoPorcentagem),
        valorComissao,
        despesa: Number(despesa || 0),
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
      
      // Resetar TODOS os campos para próxima leitura
      setTimeout(() => {
        setRotaId('');
        setPontoId('');
        setOperadorId('');
        setEntradaAnterior('');
        setEntradaAtual('');
        setSaidaAnterior('');
        setSaidaAtual('');
        setDespesa('');
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
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
          <p className="text-gray-600 font-medium">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 pb-24 space-y-3">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Identificação */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <h2 className="font-bold text-base mb-3 text-gray-800">📍 Identificação</h2>
          
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Data</label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">1. Rota</label>
              <select
                value={rotaId}
                onChange={(e) => setRotaId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white"
                required
                disabled={loadingData}
              >
                <option value="">Selecione a rota</option>
                {rotas.map(rt => (
                  <option key={rt.id} value={rt.id}>
                    {rt.codigo} - {rt.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">2. Ponto</label>
              <select
                value={pontoId}
                onChange={(e) => setPontoId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white"
                required
                disabled={!rotaId || loadingData}
              >
                <option value="">
                  {!rotaId ? 'Selecione uma rota primeiro' : 'Selecione o ponto'}
                </option>
                {pontosFiltrados.map(pt => (
                  <option key={pt.id} value={pt.id}>
                    {pt.codigo} - {pt.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                3. Máquina {operadoresFiltrados.length > 0 && `(${operadoresFiltrados.length} pendente)`}
              </label>
              <select
                value={operadorId}
                onChange={(e) => setOperadorId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white"
                required
                disabled={!pontoId || loadingData}
              >
                <option value="">
                  {!pontoId ? 'Selecione um ponto primeiro' : 'Selecione a máquina'}
                </option>
                {operadoresFiltrados.map(op => (
                  <option key={op.id} value={op.id}>
                    {op.codigo} - {op.nome}
                  </option>
                ))}
              </select>
              {loadingUltimaLeitura && (
                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" />
                  Carregando...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Leituras */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <h2 className="font-bold text-base mb-3 text-blue-900">🔢 Leituras</h2>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Entrada Ant.</label>
              <input
                type="number"
                value={entradaAnterior}
                onChange={(e) => setEntradaAnterior(e.target.value)}
                className="w-full p-2 border border-blue-300 rounded-lg text-sm font-mono bg-blue-50"
                placeholder="0"
                min="0"
                step="0.01"
                readOnly
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Entrada Atual</label>
              <input
                type="number"
                value={entradaAtual}
                onChange={(e) => setEntradaAtual(e.target.value)}
                className="w-full p-2 border border-blue-300 rounded-lg text-sm font-mono font-bold"
                placeholder="0"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Saída Ant.</label>
              <input
                type="number"
                value={saidaAnterior}
                onChange={(e) => setSaidaAnterior(e.target.value)}
                className="w-full p-2 border border-blue-300 rounded-lg text-sm font-mono bg-blue-50"
                placeholder="0"
                readOnly
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Saída Atual</label>
              <input
                type="number"
                value={saidaAtual}
                onChange={(e) => setSaidaAtual(e.target.value)}
                className="w-full p-2 border border-blue-300 rounded-lg text-sm font-mono font-bold"
                placeholder="0"
                required
              />
            </div>
          </div>

          {/* Totais Calculados */}
          <div className="mt-2 p-2 bg-white rounded-lg border border-blue-200">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">Total Entrada:</span>
              <span className="font-bold text-green-600">R$ {totalEntrada.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">Total Saída:</span>
              <span className="font-bold text-red-600">R$ {totalSaida.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">Entrada - Saída:</span>
              <span className="font-bold text-purple-600">R$ {entradaMenosSaida.toFixed(2)}</span>
            </div>
            {fatorConversao !== 1 && (
              <div className="flex justify-between text-xs mb-1 text-blue-700">
                <span>× Fator ({fatorConversao}):</span>
                <span className="font-bold">R$ {liquidoDaMaquina.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold border-t pt-1 mt-1">
              <span className="text-gray-800">Líquido Máquina:</span>
              <span className="text-blue-600">R$ {liquidoDaMaquina.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Financeiro */}
        <div className="bg-green-50 p-3 rounded-lg">
          <h2 className="font-bold text-base mb-3 text-green-900">💰 Financeiro</h2>
          
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Comissão %</label>
                <input
                  type="text"
                  value={`${comissaoPorcentagem}%`}
                  readOnly
                  className="w-full p-1.5 border border-gray-300 rounded text-xs bg-gray-100 text-gray-600 text-center"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fator</label>
                <input
                  type="text"
                  value={`x${fatorConversao}`}
                  readOnly
                  className="w-full p-1.5 border border-gray-300 rounded text-xs bg-gray-100 text-gray-600 text-center"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Despesas (R$)</label>
              <input
                type="number"
                value={despesa}
                onChange={(e) => setDespesa(e.target.value)}
                className="w-full p-2 border border-green-300 rounded-lg text-sm"
                placeholder="0.00"
                step="0.01"
              />
            </div>

            <div className="p-2 bg-white rounded-lg border border-green-200">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">Comissão:</span>
                <span className="font-bold text-orange-600">- R$ {valorComissao.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">Despesas:</span>
                <span className="font-bold text-orange-600">- R$ {Number(despesa || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t pt-1 mt-1">
                <span className="text-gray-800">Total Final:</span>
                <span className="text-green-600">R$ {totalFinal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upload de Foto - DESATIVADO */}
        <div className="bg-gray-50 p-3 rounded-lg border-2 border-dashed border-gray-300">
          <h2 className="font-bold text-base mb-2 text-gray-600">📸 Foto (Desativada)</h2>
          <p className="text-xs text-gray-500 text-center py-2">
            ⚠️ Recurso temporariamente desativado para reduzir custos iniciais.
            <br />
            Será reativado após rentabilização do projeto.
          </p>
        </div>

        {/* Mensagem de Status */}
        {mensagem && (
          <div className={`p-4 rounded-xl text-center font-bold ${
            mensagem.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {mensagem}
          </div>
        )}

        {/* Botão de Envio */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-4 rounded-full text-white text-base font-bold shadow-lg transition-all duration-200 ${
            loading ? 'bg-slate-300 opacity-70' : 'bg-[#008069] hover:bg-[#006d59] active:bg-[#005c4b] hover:shadow-xl'
          }`}
        >
          {loading ? 'Salvando...' : '💾 Salvar Leitura'}
        </button>
      </form>
    </div>
  );
};

export default NovaLeituraMobile;
