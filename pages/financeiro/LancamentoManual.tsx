import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalidade } from '../../contexts/LocalidadeContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { getUltimaLeitura, saveVenda } from '../../services/financeiroService';
import { Operador, Venda } from '../../types';
import { GlassCard, AlertBox, PageHeader, InputField, SelectField } from '../../components/MacOSDesign';
import { Save, Upload } from 'lucide-react';

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
  const [operadores, setOperadores] = useState<any[]>([]);
  const [selectedPontoId, setSelectedPontoId] = useState<string>('');
  const [selectedOperadorId, setSelectedOperadorId] = useState<string>('');
  const [selectedPonto, setSelectedPonto] = useState<Ponto | null>(null);
  const [selectedOperador, setSelectedOperador] = useState<any | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Venda>({
    defaultValues: {
      data: new Date().toISOString().split('T')[0],
      comissaoPorcentagem: 0,
      despesa: 0
    }
  });

  // Calculations state
  const entradaAtual = watch('entradaAtual', 0);
  const entradaAnterior = watch('entradaAnterior', 0);
  const saidaAtual = watch('saidaAtual', 0);
  const saidaAnterior = watch('saidaAnterior', 0);
  const comissaoPorcentagem = watch('comissaoPorcentagem', 20);
  const despesa = watch('despesa', 0);

  const totalEntrada = entradaAtual - entradaAnterior;
  const totalSaida = saidaAtual - saidaAnterior;
  const totalGeral = totalEntrada - totalSaida;
  
  // Aplicar fator de conversão do operador
  const fatorConversao = selectedOperador?.fatorConversao || 1;
  const valorComissao = totalGeral > 0 ? (totalGeral * fatorConversao * (comissaoPorcentagem / 100)) : 0;
  const totalFinal = (totalGeral * fatorConversao) - valorComissao - despesa;

  useEffect(() => {
    loadPontos();
  }, [selectedLocalidade]);

  useEffect(() => {
    if (selectedPontoId) {
      loadOperadores(selectedPontoId);
    } else {
      setOperadores([]);
      setValue('operadorId', '');
    }
  }, [selectedPontoId]);

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
      setPontos(pontosData);
    } catch (error) {
      console.error('Erro ao carregar pontos:', error);
    }
  };

  const loadOperadores = async (pontoId: string) => {
    try {
      const operadoresQuery = query(
        collection(db, 'operadores'),
        where('active', '==', true),
        where('pontoId', '==', pontoId)
      );
      const snapshot = await getDocs(operadoresQuery);
      const operadoresData = snapshot.docs.map(doc => ({
        id: doc.id,
        codigo: doc.data().codigo,
        nome: doc.data().nome,
        pontoId: doc.data().pontoId,
        fatorConversao: doc.data().fatorConversao || 0.01
      }));
      setOperadores(operadoresData);
    } catch (error) {
      console.error('Erro ao carregar operadores:', error);
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
      return;
    }

    setLoadingHistory(true);
    try {
      const operador = operadores.find(op => op.id === opId);
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

  const onSubmit = async (data: Venda) => {
    if (!userProfile) return;
    
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
        localidadeId: operador?.localidadeId || ''
      };

      await saveVenda(payload, userProfile.uid);
      setMessage('Leitura salva com sucesso!');
      setMessageType('success');
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
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader 
        title="Lançamento de Leitura"
        subtitle="Registre leituras manuais de máquinas e operadores"
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
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
                {operadores.map(op => (
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

        <button 
          type="submit" 
          disabled={!isAuthorized || loading}
          className={`w-full py-4 rounded-xl font-bold text-lg text-white transition-all duration-300 flex items-center justify-center gap-2 ${
            isAuthorized && !loading ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-[1.02]' : 'bg-slate-400 cursor-not-allowed'
          }`}
        >
          <Save size={22} /> {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </div>
  );
};

export default LancamentoManual;