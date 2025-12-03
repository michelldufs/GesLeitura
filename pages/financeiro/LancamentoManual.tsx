import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { getActiveCollection } from '../../services/operacionalService';
import { getUltimaLeitura, saveVenda } from '../../services/financeiroService';
import { Operador, Venda } from '../../types';
import { CheckCircle, AlertTriangle } from 'lucide-react';

const LancamentoManual: React.FC = () => {
  const { userProfile } = useAuth();
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Venda>();

  // Calculations state
  const entradaAtual = watch('entradaAtual', 0);
  const entradaAnterior = watch('entradaAnterior', 0);
  const saidaAtual = watch('saidaAtual', 0);
  const saidaAnterior = watch('saidaAnterior', 0);
  const comissaoPorcentagem = watch('comissaoPorcentagem', 20); // default 20%
  const despesa = watch('despesa', 0);

  const totalEntrada = entradaAtual - entradaAnterior;
  const totalSaida = saidaAtual - saidaAnterior;
  const totalGeral = totalEntrada - totalSaida;
  
  // Commission logic: if result <= 0, commission is 0
  const valorComissao = totalGeral > 0 ? (totalGeral * (comissaoPorcentagem / 100)) : 0;
  const totalFinal = totalGeral - valorComissao - despesa;

  useEffect(() => {
    // Load Operators
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
    try {
      const operador = operadores.find(o => o.id === data.operadorId);
      
      // Enrich data with calculations
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
        fotoUrl: '', // TODO: Implementar upload de foto
        userId: userProfile.uid,
        localidadeId: operador?.localidadeId || ''
      };

      await saveVenda(payload, userProfile.uid);
      alert('Leitura salva com sucesso!');
      // Reset form or redirect
    } catch (error: any) {
      alert(error.message);
    }
  };

  const isColeta = userProfile?.role === 'coleta';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <CheckCircle className="text-green-600" /> Lançamento de Leitura
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Selection */}
        <div className="bg-white p-4 rounded shadow">
          <label className="block text-sm font-medium mb-1">Operador / Máquina</label>
          <select 
            {...register('operadorId', { required: true })}
            onChange={handleOperadorChange}
            className="w-full border rounded p-2"
          >
            <option value="">Selecione...</option>
            {operadores.map(op => (
              <option key={op.id} value={op.id}>{op.nome} - {op.codigo}</option>
            ))}
          </select>
          {loadingHistory && <span className="text-xs text-blue-500">Buscando histórico...</span>}
        </div>

        {/* Counters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded shadow border-l-4 border-blue-500">
            <h3 className="font-bold mb-4">Entradas (Bruto)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Anterior</label>
                <input {...register('entradaAnterior')} readOnly className="w-full bg-gray-100 p-2 rounded" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Atual</label>
                <input type="number" {...register('entradaAtual', { valueAsNumber: true, required: true })} className="w-full border p-2 rounded" />
              </div>
            </div>
            <div className="mt-2 text-right font-mono font-bold text-blue-600">Diff: {totalEntrada}</div>
          </div>

          <div className="bg-white p-4 rounded shadow border-l-4 border-red-500">
            <h3 className="font-bold mb-4">Saídas (Prêmios)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Anterior</label>
                <input {...register('saidaAnterior')} readOnly className="w-full bg-gray-100 p-2 rounded" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Atual</label>
                <input type="number" {...register('saidaAtual', { valueAsNumber: true, required: true })} className="w-full border p-2 rounded" />
              </div>
            </div>
            <div className="mt-2 text-right font-mono font-bold text-red-600">Diff: {totalSaida}</div>
          </div>
        </div>

        {/* Financials (Hidden for purely Coleta role if strict privacy needed, but usually collectors need to see commission) */}
        <div className="bg-white p-4 rounded shadow border-l-4 border-green-500">
          <h3 className="font-bold mb-4">Fechamento do Caixa</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
               <label className="block text-sm">Data</label>
               <input type="date" {...register('data', { required: true })} className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block text-sm">Comissão (%)</label>
              <input type="number" {...register('comissaoPorcentagem', { valueAsNumber: true })} className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block text-sm">Despesas (R$)</label>
              <input type="number" step="0.01" {...register('despesa', { valueAsNumber: true })} className="w-full border p-2 rounded" />
            </div>
          </div>

          {!isColeta && (
            <div className="mt-6 bg-gray-50 p-4 rounded">
              <div className="flex justify-between border-b pb-2">
                <span>Bruto (Entrada - Saída):</span>
                <span className={totalGeral < 0 ? 'text-red-500' : 'text-gray-800'}>{totalGeral.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 text-red-500 text-sm">
                <span>(-) Comissão:</span>
                <span>{valorComissao.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 text-red-500 text-sm">
                <span>(-) Despesas:</span>
                <span>{despesa.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t font-bold text-xl">
                <span>Líquido (Cofre):</span>
                <span className={totalFinal < 0 ? 'text-red-600' : 'text-green-600'}>R$ {totalFinal.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Proof Upload (Mock UI) */}
        <div className="border-2 border-dashed border-gray-300 p-6 text-center rounded">
          <p className="text-gray-500">Anexar foto do comprovante/máquina (Obrigatório)</p>
          <input type="file" className="mt-2" accept="image/*" />
        </div>

        <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 transition">
          SALVAR LEITURA
        </button>
      </form>
    </div>
  );
};

export default LancamentoManual;