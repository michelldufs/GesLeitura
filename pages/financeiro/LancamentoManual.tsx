import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalidade } from '../../contexts/LocalidadeContext';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { getUltimaLeitura, saveVenda } from '../../services/financeiroService';
import { Operador, Venda } from '../../types';
import { GlassCard, AlertBox, PageHeader, Modal, ButtonPrimary, ButtonSecondary } from '../../components/MacOSDesign';
import { Plus, FileText, Eye, Camera } from 'lucide-react';

interface Ponto {
  id: string;
  codigo: string;
  nome: string;
  localidadeId: string;
  comissao?: number;
}

const LancamentoManual: React.FC = () => {
  const { userProfile } = useAuth();
  const { selectedLocalidade } = useLocalidade();
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [operadores, setOperadores] = useState<any[]>([]); // Lista completa para tabela
  const [operadoresFiltrados, setOperadoresFiltrados] = useState<any[]>([]); // Filtrados por ponto
  const [vendas, setVendas] = useState<any[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<any[]>([]);
  const [selectedPontoId, setSelectedPontoId] = useState<string>('');
  const [selectedOperadorId, setSelectedOperadorId] = useState<string>('');
  const [selectedPonto, setSelectedPonto] = useState<Ponto | null>(null);
  const [selectedOperador, setSelectedOperador] = useState<any | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingVendas, setLoadingVendas] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [showModal, setShowModal] = useState(false);
  
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<Venda>({
    defaultValues: {
      data: new Date().toISOString().split('T')[0],
      comissaoPorcentagem: 0,
      despesa: 0,
      entradaAnterior: undefined,
      entradaAtual: undefined,
      saidaAnterior: undefined,
      saidaAtual: undefined
    }
  });

  // Calculations state
  const entradaAtual = watch('entradaAtual', 0);
  const entradaAnterior = watch('entradaAnterior', 0);
  const saidaAtual = watch('saidaAtual', 0);
  const saidaAnterior = watch('saidaAnterior', 0);
  const comissaoPorcentagem = watch('comissaoPorcentagem', 20);
  const despesa = watch('despesa', 0);
  const centroCustoId = watch('centroCustoId', '');

  const totalEntrada = entradaAtual - entradaAnterior;
  const totalSaida = saidaAtual - saidaAnterior;
  const totalGeral = totalEntrada - totalSaida;
  
  // Aplicar fator de conversão do operador
  const fatorConversao = selectedOperador?.fatorConversao || 1;
  const valorComissao = totalGeral > 0 ? (totalGeral * fatorConversao * (comissaoPorcentagem / 100)) : 0;
  const totalFinal = (totalGeral * fatorConversao) - valorComissao - despesa;

  useEffect(() => {
    loadPontos();
    loadVendas();
    loadAllOperadores(); // Carregar todos operadores para exibir na tabela
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

  useEffect(() => {
    if (selectedPontoId) {
      const filtered = operadores.filter(op => op.pontoId === selectedPontoId);
      setOperadoresFiltrados(filtered);
    } else {
      setOperadoresFiltrados([]);
      setValue('operadorId', '');
    }
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
        comissao: doc.data().comissao || 0
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
    
    if (!opId) {
      setSelectedOperador(null);
      setValue('entradaAnterior', undefined);
      setValue('saidaAnterior', undefined);
      return;
    }

    setLoadingHistory(true);
    try {
      const operador = operadoresFiltrados.find(op => op.id === opId);
      setSelectedOperador(operador);
      
      const last = await getUltimaLeitura(opId);
      if (last) {
        setValue('entradaAnterior', last.entradaAtual);
        setValue('saidaAnterior', last.saidaAtual);
      } else {
        setValue('entradaAnterior', 0);
        setValue('saidaAnterior', 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenModal = () => {
    reset({
      data: new Date().toISOString().split('T')[0],
      comissaoPorcentagem: 0,
      despesa: 0,
      entradaAnterior: undefined,
      saidaAnterior: undefined,
      entradaAtual: undefined,
      saidaAtual: undefined
    });
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
      
      const payload = {
        ...data,
        pontoId: operador?.pontoId || '',
        rotaId: operador?.rotaId || '',
        totalEntrada,
        totalSaida,
        totalGeral,
        valorComissao,
        totalFinal,
        status_conferencia: 'pendente' as const,
        fotoUrl: '',
        userId: userProfile.uid,
        localidadeId: selectedLocalidade,
        centroCustoId: data.centroCustoId || null
      };
      
      console.log('Salvando venda com payload:', payload);

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
      <div className="p-8 max-w-7xl mx-auto">
        <PageHeader 
          title="Lançamento de Leitura"
          subtitle="Registre leituras manuais de máquinas e operadores"
          action={
            isAuthorized ? (
              <ButtonPrimary onClick={handleOpenModal}>
                <Plus size={20} />
                Nova Leitura
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
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileText size={20} />
            Leituras Cadastradas
            <span className="text-xs text-slate-500 font-normal ml-2">({vendas.length} encontradas)</span>
          </h2>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                if (!selectedLocalidade) {
                  alert('Selecione uma localidade primeiro!');
                  return;
                }
                if (!confirm('Deseja corrigir todas as vendas sem localidade, atribuindo a localidade atual?')) {
                  return;
                }
                
                try {
                  const { collection, query, where, getDocs, updateDoc, doc } = await import('firebase/firestore');
                  const { db } = await import('../../services/firebaseConfig');
                  
                  // Buscar vendas sem localidade ou com localidade vazia
                  const vendasQuery = query(
                    collection(db, 'vendas'),
                    where('localidadeId', 'in', ['', null])
                  );
                  
                  const snapshot = await getDocs(vendasQuery);
                  console.log(`Encontradas ${snapshot.docs.length} vendas sem localidade`);
                  
                  let count = 0;
                  for (const docSnap of snapshot.docs) {
                    await updateDoc(doc(db, 'vendas', docSnap.id), {
                      localidadeId: selectedLocalidade
                    });
                    count++;
                  }
                  
                  alert(`${count} vendas corrigidas com sucesso!`);
                  loadVendas();
                } catch (error) {
                  console.error('Erro ao corrigir vendas:', error);
                  alert('Erro ao corrigir vendas. Veja o console.');
                }
              }}
              className="text-xs px-3 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg transition-colors font-medium"
            >
              🔧 Corrigir Vendas
            </button>
            <button
              onClick={() => {
                console.log('=== DEBUG INFO ===');
                console.log('Localidade selecionada:', selectedLocalidade);
                console.log('Total de vendas:', vendas.length);
                console.log('Vendas:', vendas);
                console.log('Pontos carregados:', pontos.length);
                console.log('Operadores carregados:', operadores.length);
                loadVendas();
              }}
              className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
            >
              🔄 Recarregar
            </button>
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
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Ponto</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Operador</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Total Geral</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Comissão</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Despesa</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Total Final</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {vendas.map((venda) => {
                  const ponto = pontos.find(p => p.id === venda.pontoId);
                  const operador = operadores.find(o => o.id === venda.operadorId);
                  
                  console.log('Renderizando venda:', {
                    id: venda.id,
                    data: venda.data,
                    pontoId: venda.pontoId,
                    operadorId: venda.operadorId,
                    ponto: ponto?.nome,
                    operador: operador?.nome
                  });
                  
                  return (
                    <tr key={venda.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {new Date(venda.data).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {ponto?.codigo} - {ponto?.nome || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {operador?.codigo} - {operador?.nome || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-semibold text-slate-900">
                        R$ {(venda.totalGeral || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-yellow-700">
                        R$ {(venda.valorComissao || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        {venda.despesa > 0 ? (
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-orange-700 font-semibold">
                              R$ {venda.despesa.toFixed(2)}
                            </span>
                            {venda.centroCustoId && (
                              <span className="text-xs text-slate-500 mt-0.5" title={centrosCusto.find(c => c.id === venda.centroCustoId)?.nome}>
                                {centrosCusto.find(c => c.id === venda.centroCustoId)?.nome || 'N/A'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="font-mono text-slate-400">R$ 0,00</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-bold text-blue-600">
                        R$ {(venda.totalFinal || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          venda.status_conferencia === 'conferido' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {venda.status_conferencia === 'conferido' ? 'Conferido' : 'Pendente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                          title="Visualizar"
                        >
                          <Eye size={18} />
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
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 w-full max-w-4xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-slate-200 px-8 py-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-slate-900">Nova Leitura</h2>
              <button
                onClick={handleCloseModal}
                type="button"
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
        
        {/* Header Selection - Data, Rota, Ponto/Máquina */}
        <GlassCard className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Data */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Data <span className="text-red-500">*</span>
              </label>
              <input 
                type="date" 
                {...register('data', { required: 'Obrigatório' })} 
                disabled={!isAuthorized}
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50"
              />
            </div>

            {/* Ponto de Venda */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Ponto/Máquina <span className="text-red-500">*</span>
              </label>
              <select 
                value={selectedPontoId}
                onChange={(e) => handlePontoChange(e.target.value)}
                disabled={!isAuthorized}
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50"
              >
                <option value="">Selecione o ponto...</option>
                {pontos.map(ponto => (
                  <option key={ponto.id} value={ponto.id}>
                    {ponto.codigo} - {ponto.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Operador/Máquina */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Operador / Máquina <span className="text-red-500">*</span>
              </label>
              <select 
                {...register('operadorId', { required: 'Operador é obrigatório' })}
                onChange={handleOperadorChange}
                disabled={!isAuthorized || !selectedPontoId}
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50"
              >
                <option value="">Selecione a máquina...</option>
                {operadoresFiltrados.map(op => (
                  <option key={op.id} value={op.id}>
                    {op.codigo} - {op.nome}
                  </option>
                ))}
              </select>
              {loadingHistory && <p className="text-xs text-blue-500 mt-2">Buscando histórico...</p>}
            </div>
          </div>
        </GlassCard>

        {/* Counters Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Entradas */}
          <div className="bg-green-50/30 border-2 border-green-200 rounded-xl p-5">
            <h3 className="text-base font-bold text-green-700 mb-4">Entradas</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Anterior <span className="text-red-500">*</span>
                </label>
                <input 
                  {...register('entradaAnterior')} 
                  readOnly 
                  placeholder="-"
                  className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Atual <span className="text-red-500">*</span>
                </label>
                <input 
                  type="number" 
                  {...register('entradaAtual', { valueAsNumber: true, required: 'Obrigatório' })} 
                  disabled={!isAuthorized}
                  placeholder="Digite o valor"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-green-500 outline-none disabled:bg-slate-50 font-mono text-sm"
                />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-green-300 flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-700">Total:</span>
              <span className="text-lg font-bold text-green-600">R$ {totalEntrada.toFixed(2)}</span>
            </div>
          </div>

          {/* Saídas */}
          <div className="bg-red-50/30 border-2 border-red-200 rounded-xl p-5">
            <h3 className="text-base font-bold text-red-700 mb-4">Saídas (Prêmios)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Anterior <span className="text-red-500">*</span>
                </label>
                <input 
                  {...register('saidaAnterior')} 
                  readOnly 
                  placeholder="-"
                  className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Atual <span className="text-red-500">*</span>
                </label>
                <input 
                  type="number" 
                  {...register('saidaAtual', { valueAsNumber: true, required: 'Obrigatório' })} 
                  disabled={!isAuthorized}
                  placeholder="Digite o valor"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-red-500 outline-none disabled:bg-slate-50 font-mono text-sm"
                />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-red-300 flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-700">Total:</span>
              <span className="text-lg font-bold text-red-600">R$ {totalSaida.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Resumo Financeiro em Linha */}
        {!isColeta && (
          <GlassCard className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {/* Total Geral */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Total Geral</label>
                <div className={`text-xl font-bold font-mono ${totalGeral < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                  R$ {totalGeral.toFixed(2)}
                </div>
              </div>

              {/* % Ponto */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <label className="block text-xs font-semibold text-slate-600 mb-1">% Ponto</label>
                <input 
                  type="number" 
                  {...register('comissaoPorcentagem', { valueAsNumber: true })} 
                  disabled={!isAuthorized}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 font-mono text-lg font-bold"
                />
              </div>

              {/* Comissão */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Comissão</label>
                <div className="text-xl font-bold font-mono text-yellow-700">
                  R$ {valorComissao.toFixed(2)}
                </div>
              </div>

              {/* Despesa */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <label className="block text-xs font-semibold text-slate-600 mb-1">💰 Despesa</label>
                <input 
                  type="number" 
                  step="0.01" 
                  {...register('despesa', { valueAsNumber: true })} 
                  disabled={!isAuthorized}
                  placeholder="0"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 font-mono text-lg font-bold"
                />
              </div>
            </div>

            {/* Centro de Custo - Aparece apenas se despesa > 0 */}
            {despesa > 0 && (
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  🎯 Centro de Custo <span className="text-red-500">*</span>
                  <span className="text-xs text-slate-500 ml-2">({centrosCusto.length} disponíveis)</span>
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

            {/* Total Final (Caixa) em Destaque */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔥</span>
                  <span className="text-lg font-bold text-slate-800">Total Final (Caixa)</span>
                </div>
                <div className={`text-3xl font-bold font-mono ${totalFinal < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                  R$ {totalFinal.toFixed(2)}
                </div>
              </div>
            </div>
          </GlassCard>
        )}
        
        {/* File Upload */}
        <GlassCard className="p-6">
          <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            📷 Imagem / Comprovante (Opcional)
          </label>
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center bg-slate-50/50 hover:bg-slate-100/50 transition-colors cursor-pointer">
            <input 
              type="file" 
              accept="image/*"
              disabled={!isAuthorized}
              className="hidden"
              id="fileUpload"
            />
            <label htmlFor="fileUpload" className="cursor-pointer">
              <div className="text-slate-400 mb-2">
                <svg className="mx-auto w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-slate-600 font-medium">Toque para adicionar</p>
              <p className="text-xs text-slate-500 mt-1">Formatos suportados: JPG, PNG, GIF</p>
            </label>
          </div>
        </GlassCard>

              <div className="flex gap-3 sticky bottom-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-8 py-6 -mx-8 -mb-8 mt-6">
                <button
                  onClick={handleCloseModal}
                  type="button"
                  className="flex-1 px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  {loading ? 'Salvando...' : 'Salvar Leitura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default LancamentoManual;