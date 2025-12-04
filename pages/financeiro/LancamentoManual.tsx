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
}

const LancamentoManual: React.FC = () => {
  const { userProfile } = useAuth();
  const { selectedLocalidade } = useLocalidade();
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [selectedPontoId, setSelectedPontoId] = useState<string>('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Venda>();

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
  
  const valorComissao = totalGeral > 0 ? (totalGeral * (comissaoPorcentagem / 100)) : 0;
  const totalFinal = totalGeral - valorComissao - despesa;

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
        ...doc.data()
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
        ...doc.data()
      } as Operador));
      setOperadores(operadoresData);
    } catch (error) {
      console.error('Erro ao carregar operadores:', error);
    }
  };

  const handleOperadorChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const opId = e.target.value;
    if (!opId) return;

    setLoadingHistory(true);
    try {
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
        
        {/* Selection Card */}
        <GlassCard className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Seleção de Ponto */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Ponto de Venda</label>
              <select 
                value={selectedPontoId}
                onChange={(e) => setSelectedPontoId(e.target.value)}
                disabled={!isAuthorized}
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50"
              >
                <option value="">Selecione o ponto...</option>
                {pontos.map(ponto => (
                  <option key={ponto.id} value={ponto.id}>
                    {ponto.codigo} - {ponto.nome}
                  </option>
                ))}
              </select>
              {!selectedPontoId && pontos.length === 0 && (
                <p className="text-xs text-slate-500 mt-2">Nenhum ponto disponível na localidade selecionada</p>
              )}
            </div>

            {/* Seleção de Operador/Máquina */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Operador / Máquina</label>
              <select 
                {...register('operadorId', { required: 'Operador é obrigatório' })}
                onChange={handleOperadorChange}
                disabled={!isAuthorized || !selectedPontoId}
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50"
              >
                <option value="">Selecione a máquina...</option>
                {operadores.map(op => (
                  <option key={op.id} value={op.id}>
                    {op.codigo} - {op.nome}
                  </option>
                ))}
              </select>
              {loadingHistory && <p className="text-xs text-blue-500 mt-2">Buscando histórico...</p>}
              {errors.operadorId && <p className="text-xs text-red-500 mt-2">{errors.operadorId.message}</p>}
              {selectedPontoId && operadores.length === 0 && !loadingHistory && (
                <p className="text-xs text-slate-500 mt-2">Nenhuma máquina cadastrada neste ponto</p>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Counters Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard className="p-6 border-l-4 border-blue-500">
            <h3 className="text-lg font-semibold text-blue-600 mb-4">Entradas (Bruto)</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Anterior</label>
                <input {...register('entradaAnterior')} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600 font-mono text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Atual</label>
                <input 
                  type="number" 
                  {...register('entradaAtual', { valueAsNumber: true, required: 'Obrigatório' })} 
                  disabled={!isAuthorized}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 font-mono text-sm"
                />
              </div>
            </div>
            <div className="bg-blue-50/50 border border-blue-200/50 p-3 rounded-lg text-right">
              <span className="text-xs text-slate-600">Diferença: </span>
              <span className="font-mono font-bold text-blue-600">{totalEntrada.toFixed(0)}</span>
            </div>
          </GlassCard>

          <GlassCard className="p-6 border-l-4 border-red-500">
            <h3 className="text-lg font-semibold text-red-600 mb-4">Saídas (Prêmios)</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Anterior</label>
                <input {...register('saidaAnterior')} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600 font-mono text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Atual</label>
                <input 
                  type="number" 
                  {...register('saidaAtual', { valueAsNumber: true, required: 'Obrigatório' })} 
                  disabled={!isAuthorized}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-red-500 outline-none disabled:bg-slate-50 font-mono text-sm"
                />
              </div>
            </div>
            <div className="bg-red-50/50 border border-red-200/50 p-3 rounded-lg text-right">
              <span className="text-xs text-slate-600">Diferença: </span>
              <span className="font-mono font-bold text-red-600">{totalSaida.toFixed(0)}</span>
            </div>
          </GlassCard>
        </div>

        {/* Financials Card */}
        <GlassCard className="p-8 border-l-4 border-green-500">
          <h3 className="text-lg font-semibold text-green-600 mb-6">Fechamento do Caixa</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Data</label>
              <input 
                type="date" 
                {...register('data', { required: 'Obrigatório' })} 
                disabled={!isAuthorized}
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-900 focus:ring-2 focus:ring-green-500 outline-none disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Comissão (%)</label>
              <input 
                type="number" 
                {...register('comissaoPorcentagem', { valueAsNumber: true })} 
                disabled={!isAuthorized}
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-900 focus:ring-2 focus:ring-green-500 outline-none disabled:bg-slate-50 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Despesas (R$)</label>
              <input 
                type="number" 
                step="0.01" 
                {...register('despesa', { valueAsNumber: true })} 
                disabled={!isAuthorized}
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-900 focus:ring-2 focus:ring-green-500 outline-none disabled:bg-slate-50 font-mono"
              />
            </div>
          </div>

          {!isColeta && (
            <div className="bg-slate-50/50 border border-slate-200/50 p-6 rounded-lg space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-700">Bruto (Entrada - Saída):</span>
                <span className={`font-bold font-mono ${totalGeral < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                  {totalGeral.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm text-red-600">
                <span>(-) Comissão ({comissaoPorcentagem}%):</span>
                <span className="font-mono">R$ {valorComissao.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-red-600">
                <span>(-) Despesas:</span>
                <span className="font-mono">R$ {despesa.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t border-slate-200 pt-4">
                <span className="text-slate-900">Líquido (Cofre):</span>
                <span className={`font-mono ${totalFinal < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  R$ {totalFinal.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </GlassCard>
        
        {/* File Upload */}
        <GlassCard className="p-6 border-2 border-dashed border-slate-200">
          <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Upload size={18} className="text-slate-600" /> Anexar foto do comprovante/máquina
          </label>
          <input 
            type="file" 
            accept="image/*"
            disabled={!isAuthorized}
            className="w-full px-4 py-3 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-slate-500 mt-2">Formatos suportados: JPG, PNG, GIF</p>
        </GlassCard>

        <button 
          type="submit" 
          disabled={!isAuthorized || loading}
          className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 ${
            isAuthorized && !loading ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg' : 'bg-slate-400 cursor-not-allowed'
          }`}
        >
          <Save size={20} /> {loading ? 'Salvando...' : 'SALVAR LEITURA'}
        </button>
      </form>
    </div>
  );
};

export default LancamentoManual;