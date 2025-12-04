import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { getActiveCollection } from '../../services/operacionalService';
import { getUltimaLeitura, saveVenda } from '../../services/financeiroService';
import { Operador, Venda } from '../../types';
import { Save, Upload } from 'lucide-react';

const LancamentoManual: React.FC = () => {
  const { userProfile } = useAuth();
  const [operadores, setOperadores] = useState<Operador[]>([]);
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
    getActiveCollection<Operador>('operadores').then(setOperadores);
  }, []);

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
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Lançamento de Leitura</h1>

      {!isAuthorized && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded mb-6">
          Seu perfil ({userProfile?.role}) não possui permissão para lançar leituras.
        </div>
      )}

      {message && (
        <div className={`mb-6 p-4 rounded ${messageType === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Selection Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <label className="block text-sm font-bold text-gray-700 mb-2">Operador / Máquina</label>
          <select 
            {...register('operadorId', { required: 'Operador é obrigatório' })}
            onChange={handleOperadorChange}
            disabled={!isAuthorized}
            className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
          >
            <option value="">Selecione...</option>
            {operadores.map(op => (
              <option key={op.id} value={op.id}>{op.nome} - {op.codigo}</option>
            ))}
          </select>
          {loadingHistory && <p className="text-xs text-blue-500 mt-1">Buscando histórico...</p>}
          {errors.operadorId && <p className="text-xs text-red-500 mt-1">{errors.operadorId.message}</p>}
        </div>

        {/* Counters Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-lg font-bold text-blue-700 mb-4">Entradas (Bruto)</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Anterior</label>
                <input {...register('entradaAnterior')} readOnly className="w-full bg-gray-100 p-3 rounded border border-gray-200 text-gray-600 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Atual</label>
                <input 
                  type="number" 
                  {...register('entradaAtual', { valueAsNumber: true, required: 'Obrigatório' })} 
                  disabled={!isAuthorized}
                  className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 font-mono"
                />
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded text-right">
              <span className="text-xs text-gray-600">Diferença: </span>
              <span className="font-mono font-bold text-blue-600">{totalEntrada.toFixed(0)}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
            <h3 className="text-lg font-bold text-red-700 mb-4">Saídas (Prêmios)</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Anterior</label>
                <input {...register('saidaAnterior')} readOnly className="w-full bg-gray-100 p-3 rounded border border-gray-200 text-gray-600 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Atual</label>
                <input 
                  type="number" 
                  {...register('saidaAtual', { valueAsNumber: true, required: 'Obrigatório' })} 
                  disabled={!isAuthorized}
                  className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 font-mono"
                />
              </div>
            </div>
            <div className="bg-red-50 p-3 rounded text-right">
              <span className="text-xs text-gray-600">Diferença: </span>
              <span className="font-mono font-bold text-red-600">{totalSaida.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Financials Card */}
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <h3 className="text-lg font-bold text-green-700 mb-4">Fechamento do Caixa</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Data</label>
              <input 
                type="date" 
                {...register('data', { required: 'Obrigatório' })} 
                disabled={!isAuthorized}
                className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Comissão (%)</label>
              <input 
                type="number" 
                {...register('comissaoPorcentagem', { valueAsNumber: true })} 
                disabled={!isAuthorized}
                className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Despesas (R$)</label>
              <input 
                type="number" 
                step="0.01" 
                {...register('despesa', { valueAsNumber: true })} 
                disabled={!isAuthorized}
                className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 font-mono"
              />
            </div>
          </div>

          {!isColeta && (
            <div className="bg-gray-50 p-4 rounded space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Bruto (Entrada - Saída):</span>
                <span className={`font-bold font-mono ${totalGeral < 0 ? 'text-red-600' : 'text-gray-800'}`}>
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
              <div className="flex justify-between text-lg font-bold border-t pt-3">
                <span>Líquido (Cofre):</span>
                <span className={`font-mono ${totalFinal < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  R$ {totalFinal.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* File Upload */}
        <div className="bg-white p-6 rounded-lg shadow-md border-2 border-dashed border-gray-300">
          <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <Upload size={18} /> Anexar foto do comprovante/máquina
          </label>
          <input 
            type="file" 
            accept="image/*"
            disabled={!isAuthorized}
            className="w-full p-2 border border-gray-300 rounded cursor-pointer disabled:opacity-50"
          />
          <p className="text-xs text-gray-500 mt-2">Formatos suportados: JPG, PNG, GIF</p>
        </div>

        <button 
          type="submit" 
          disabled={!isAuthorized || loading}
          className={`w-full py-3 rounded font-bold text-white transition-colors flex items-center justify-center gap-2 ${
            isAuthorized && !loading ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          <Save size={20} /> {loading ? 'Salvando...' : 'SALVAR LEITURA'}
        </button>
      </form>
    </div>
  );
};

export default LancamentoManual;