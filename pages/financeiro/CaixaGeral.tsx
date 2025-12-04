import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getActiveCollection } from '../../services/operacionalService';
import { fecharMes } from '../../services/financeiroService';
import { Cota } from '../../types';
import { Lock, Calculator, Download } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';

const CaixaGeral: React.FC = () => {
  const { userProfile } = useAuth();
  
  // State
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [localidadeId, setLocalidadeId] = useState('');
  
  const [cotas, setCotas] = useState<Cota[]>([]);
  const [vendasTotal, setVendasTotal] = useState(0);
  const [despesasOp, setDespesasOp] = useState(0);
  const [valorRetido, setValorRetido] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  
  // Calculated
  const lucroLiquido = vendasTotal - despesasOp;
  const baseRateio = lucroLiquido - valorRetido;

  // Load Data
  useEffect(() => {
    getActiveCollection<Cota>('cotas').then(setCotas);
  }, []);

  const calcularPrevia = async () => {
    if (!localidadeId) {
      setMessage('Selecione uma localidade');
      setMessageType('error');
      return;
    }
    
    // Mock data - would query Firestore for real data
    setVendasTotal(15000);
    setDespesasOp(2000);
    setMessage('Cálculo realizado com sucesso!');
    setMessageType('success');
  };

  const handleFecharMes = async () => {
    if (!userProfile) return;
    if (!window.confirm('ATENÇÃO: Isso irá bloquear edições para este período. Confirmar?')) return;

    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      await fecharMes(
        localidadeId, mes, ano, valorRetido, userProfile.uid, cotas, 
        { lucroLiquido }
      );
      setMessage('Mês fechado com sucesso!');
      setMessageType('success');
    } catch (e: any) {
      setMessage(e?.message || 'Erro ao fechar mês');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const isAuthorized = userProfile && ['admin', 'gerente', 'socio'].includes(userProfile.role);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Caixa Geral & Fechamento</h1>

      {!isAuthorized && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded mb-6">
          Seu perfil ({userProfile?.role}) não possui permissão para acessar caixa.
        </div>
      )}

      {message && (
        <div className={`mb-6 p-4 rounded ${messageType === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
          {message}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
            <select value={mes} onChange={e => setMes(Number(e.target.value))} className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none">
              {[...Array(12)].map((_, i) => <option key={i} value={i+1}>Mês {i+1}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
            <input type="number" value={ano} onChange={e => setAno(Number(e.target.value))} className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Localidade</label>
            <select value={localidadeId} onChange={e => setLocalidadeId(e.target.value)} className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Selecione...</option>
              <option value="loc1">Matriz (Demo)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button 
              onClick={calcularPrevia}
              disabled={!isAuthorized}
              className={`w-full px-4 py-2 rounded text-white font-bold transition-colors flex items-center justify-center gap-2 ${
                isAuthorized ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              <Calculator size={20} /> Calcular
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Totals Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Resumo Operacional</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">(+) Total Vendas</span>
              <span className="font-bold text-green-600">R$ {vendasTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">(-) Despesas Op.</span>
              <span className="font-bold text-red-600">R$ {despesasOp.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-4 border-t text-lg font-bold">
              <span>= Lucro Liquido</span>
              <span className="text-blue-600">R$ {lucroLiquido.toFixed(2)}</span>
            </div>
            
            <div className="mt-6 bg-yellow-50 p-4 rounded border border-yellow-200">
              <label className="block text-sm font-bold text-yellow-800 mb-2">Retenção (Capital de Giro)</label>
              <input 
                type="number" 
                value={valorRetido} 
                onChange={e => setValorRetido(Number(e.target.value))}
                disabled={!isAuthorized}
                className="w-full border border-gray-300 p-2 rounded disabled:bg-gray-100"
              />
            </div>
            
            <div className="flex justify-between pt-2 font-bold">
              <span>Base Rateio:</span>
              <span className="text-purple-600">R$ {baseRateio.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Partners Simulation */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Simulação de Rateio</h2>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-700 uppercase text-xs font-bold">
                <tr>
                  <th className="px-4 py-3">Sócio</th>
                  <th className="px-4 py-3">%</th>
                  <th className="px-4 py-3">Parte (R$)</th>
                  <th className="px-4 py-3">Saldo Ant.</th>
                  <th className="px-4 py-3">Previsão Final</th>
                </tr>
              </thead>
              <tbody>
                {cotas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-center text-gray-500">Nenhuma cota cadastrada</td>
                  </tr>
                ) : (
                  cotas.map(cota => {
                    let parte = baseRateio * (cota.porcentagem / 100);
                    if (baseRateio < 0 && !cota.participaPrejuizo) parte = 0;
                    const final = parte + cota.saldoAcumulado;
                    
                    return (
                      <tr key={cota.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{cota.nome}</td>
                        <td className="px-4 py-3">{cota.porcentagem}%</td>
                        <td className={`px-4 py-3 font-semibold ${parte >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          R$ {parte.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-gray-600">R$ {(cota.saldoAcumulado || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 font-bold">R$ {final.toFixed(2)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-4">
            <button 
              disabled={!isAuthorized}
              className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={18} /> Exportar PDF
            </button>
            <button 
              onClick={handleFecharMes}
              disabled={!isAuthorized || loading || !localidadeId}
              className={`flex items-center gap-2 text-white px-6 py-2 rounded font-bold shadow-lg transition-colors ${
                isAuthorized && !loading && localidadeId ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              <Lock size={18} /> {loading ? 'Fechando...' : 'FECHAR MÊS'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CaixaGeral;