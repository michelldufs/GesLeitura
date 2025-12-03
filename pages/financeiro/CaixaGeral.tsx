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
  
  // Calculated
  const lucroLiquido = vendasTotal - despesasOp;
  const baseRateio = lucroLiquido - valorRetido;

  // Load Data
  useEffect(() => {
    // Mock load cotas active
    getActiveCollection<Cota>('cotas').then(setCotas);
  }, []);

  const calcularPrevia = async () => {
    if (!localidadeId) return;
    
    // Fetch Vendas for Mes/Ano/Loc
    const start = new Date(ano, mes - 1, 1).toISOString();
    const end = new Date(ano, mes, 0).toISOString();
    
    // In real app, date comparison in Firestore needs specific format or timestamp range
    // Mocking summation:
    setVendasTotal(15000); // Ex: retrieved from Firestore sum
    setDespesasOp(2000);   // Ex: retrieved from Firestore sum
  };

  const handleFecharMes = async () => {
    if (!userProfile) return;
    if (!window.confirm("ATENÇÃO: Isso irá bloquear edições para este período. Confirmar?")) return;

    try {
      await fecharMes(
        localidadeId, mes, ano, valorRetido, userProfile.uid, cotas, 
        { lucroLiquido }
      );
      alert("Mês fechado com sucesso!");
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Caixa Geral & Fechamento</h1>

      {/* Filters */}
      <div className="flex gap-4 mb-8 bg-white p-4 rounded shadow">
        <select value={mes} onChange={e => setMes(Number(e.target.value))} className="border p-2 rounded">
          {[...Array(12)].map((_, i) => <option key={i} value={i+1}>Mês {i+1}</option>)}
        </select>
        <input type="number" value={ano} onChange={e => setAno(Number(e.target.value))} className="border p-2 rounded w-24" />
        <select value={localidadeId} onChange={e => setLocalidadeId(e.target.value)} className="border p-2 rounded">
          <option value="">Localidade...</option>
          <option value="loc1">Matriz (Demo)</option>
        </select>
        <button onClick={calcularPrevia} className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700">
          <Calculator className="inline w-4 h-4 mr-2" /> Calcular
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Totals Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Resumo Operacional</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>(+) Total Vendas Líquido</span>
              <span className="font-bold text-green-600">R$ {vendasTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>(-) Despesas Operacionais</span>
              <span className="font-bold text-red-600">R$ {despesasOp.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-4 border-t text-lg font-bold">
              <span>= Lucro Antes Rateio</span>
              <span className="text-blue-600">R$ {lucroLiquido.toFixed(2)}</span>
            </div>
            
            <div className="mt-6 bg-yellow-50 p-4 rounded border border-yellow-200">
              <label className="block text-sm font-bold text-yellow-800 mb-1">Retenção (Capital de Giro)</label>
              <input 
                type="number" 
                value={valorRetido} 
                onChange={e => setValorRetido(Number(e.target.value))}
                className="w-full border p-2 rounded"
              />
            </div>
            
            <div className="flex justify-between pt-2 font-bold">
              <span>Base para Rateio:</span>
              <span>R$ {baseRateio.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Partners Simulation */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Simulação de Rateio</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 uppercase text-gray-600">
                <tr>
                  <th className="p-3">Sócio</th>
                  <th className="p-3">%</th>
                  <th className="p-3">Parte (R$)</th>
                  <th className="p-3">Saldo Ant.</th>
                  <th className="p-3">Previsão Final</th>
                </tr>
              </thead>
              <tbody>
                {cotas.map(cota => {
                  let parte = baseRateio * (cota.porcentagem / 100);
                  if (baseRateio < 0 && !cota.participaPrejuizo) parte = 0;
                  
                  const final = parte + cota.saldoAcumulado; // Missing adiantamentos in UI demo for brevity
                  
                  return (
                    <tr key={cota.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{cota.nome}</td>
                      <td className="p-3">{cota.porcentagem}%</td>
                      <td className={`p-3 ${parte >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {parte.toFixed(2)}
                      </td>
                      <td className="p-3 text-gray-500">{cota.saldoAcumulado.toFixed(2)}</td>
                      <td className="p-3 font-bold">{final.toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-8 flex justify-end gap-4">
            <button className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded text-gray-600 hover:bg-gray-50">
              <Download size={18} /> Exportar PDF
            </button>
            <button 
              onClick={handleFecharMes}
              className="flex items-center gap-2 bg-red-600 text-white px-6 py-2 rounded font-bold hover:bg-red-700 shadow-lg"
            >
              <Lock size={18} /> FECHAR MÊS
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CaixaGeral;