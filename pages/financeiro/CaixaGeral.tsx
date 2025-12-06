import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getActiveCollection } from '../../services/operacionalService';
import { fecharMes } from '../../services/financeiroService';
import { Cota } from '../../types.ts';
import { GlassCard, AlertBox, PageHeader, Badge, ButtonPrimary, ButtonSecondary, SelectField, InputField } from '../../components/MacOSDesign';
import { Lock, Calculator, Download, TrendingUp } from 'lucide-react';
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
    <div className="w-full">
      <PageHeader
        title="Caixa Geral & Fechamento"
        subtitle="Visualize resumos financeiros e feche períodos"
      />

      {!isAuthorized && (
        <AlertBox
          type="warning"
          message={`Seu perfil (${userProfile?.role}) não possui permissão para acessar a caixa.`}
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

      {/* Filters */}
      <GlassCard className="p-6 mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-6">Filtros e Cálculo</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <SelectField
              label="Mês"
              value={String(mes)}
              onChange={e => setMes(Number(e.target.value))}
              disabled={!isAuthorized}
              options={[...Array(12)].map((_, i) => ({ value: String(i + 1), label: `Mês ${i + 1}` }))}
            />
          </div>
          <div>
            <InputField
              label="Ano"
              type="number"
              value={ano}
              onChange={e => setAno(Number(e.target.value))}
              disabled={!isAuthorized}
            />
          </div>
          <div>
            <SelectField
              label="Localidade"
              value={localidadeId}
              onChange={e => setLocalidadeId(e.target.value)}
              disabled={!isAuthorized}
              options={[{ value: 'loc1', label: 'Matriz (Demo)' }]} // TODO: Load real localities
            />
          </div>
          <div className="flex items-end">
            <ButtonPrimary
              onClick={calcularPrevia}
              disabled={!isAuthorized}
              className="w-full h-[50px] flex items-center justify-center gap-2"
            >
              <Calculator size={18} /> Calcular
            </ButtonPrimary>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">

        {/* Totals Card */}
        <GlassCard className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100/50 rounded-lg">
              <TrendingUp className="text-blue-600" size={24} />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Resumo Operacional</h2>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between pb-3 border-b border-slate-200/50">
              <span className="text-slate-600">Total de Vendas</span>
              <span className="font-bold text-green-600">R$ {vendasTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pb-3 border-b border-slate-200/50">
              <span className="text-slate-600">Despesas Operacionais</span>
              <span className="font-bold text-red-600">R$ {despesasOp.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 pb-4 border-b border-slate-200/50">
              <span className="text-slate-900 font-bold text-lg">Lucro Líquido</span>
              <span className="font-bold text-lg text-blue-600">R$ {lucroLiquido.toFixed(2)}</span>
            </div>

            <div className="bg-yellow-50/50 p-4 rounded-lg border border-yellow-200/50 mt-4">
              <label className="block text-sm font-semibold text-slate-900 mb-2">Retenção (Capital de Giro)</label>
              <input
                type="number"
                value={valorRetido}
                onChange={e => setValorRetido(Number(e.target.value))}
                disabled={!isAuthorized}
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-900 focus:ring-2 focus:ring-yellow-500 outline-none disabled:bg-slate-50"
              />
            </div>

            <div className="flex justify-between pt-4 font-semibold text-lg">
              <span className="text-slate-900">Base Rateio:</span>
              <span className="text-purple-600">R$ {baseRateio.toFixed(2)}</span>
            </div>
          </div>
        </GlassCard>

        {/* Partners Simulation */}
        <div className="lg:col-span-2">
          <GlassCard className="p-8 h-full">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Simulação de Rateio</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200/50 mb-6">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 border-b border-slate-200/50">
                  <tr>
                    <th className="px-2 py-1 font-semibold text-slate-700 text-xs uppercase tracking-wide">Sócio</th>
                    <th className="px-2 py-1 font-semibold text-slate-700 text-xs uppercase tracking-wide">%</th>
                    <th className="px-2 py-1 font-semibold text-slate-700 text-xs uppercase tracking-wide">Parte (R$)</th>
                    <th className="px-2 py-1 font-semibold text-slate-700 text-xs uppercase tracking-wide">Saldo Ant.</th>
                    <th className="px-2 py-1 font-semibold text-slate-700 text-xs uppercase tracking-wide text-right">Previsão Final</th>
                  </tr>
                </thead>
                <tbody>
                  {cotas.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-2 py-1 text-center text-slate-500">Nenhuma cota cadastrada</td>
                    </tr>
                  ) : (
                    cotas.map(cota => {
                      let parte = baseRateio * (cota.porcentagem / 100);
                      if (baseRateio < 0 && !cota.participaPrejuizo) parte = 0;
                      const final = parte + cota.saldoAcumulado;

                      return (
                        <tr key={cota.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="px-2 py-1 font-medium text-slate-900">{cota.nome}</td>
                          <td className="px-2 py-1 text-slate-600">{cota.porcentagem}%</td>
                          <td className={`px-2 py-1 font-semibold ${parte >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            R$ {parte.toFixed(2)}
                          </td>
                          <td className="px-2 py-1 text-slate-600">R$ {(cota.saldoAcumulado || 0).toFixed(2)}</td>
                          <td className="px-2 py-1 font-bold text-slate-900 text-right">R$ {final.toFixed(2)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3">
              <button
                disabled={!isAuthorized}
                className="flex items-center gap-2 border border-slate-200/50 px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-50/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download size={18} /> Exportar PDF
              </button>
              <ButtonPrimary
                onClick={handleFecharMes}
                disabled={!isAuthorized || loading || !localidadeId}
                className={`flex items-center gap-2 ${isAuthorized && !loading && localidadeId ? 'bg-[#ef4444] hover:bg-[#dc2626] active:bg-[#b91c1c]' : ''
                  }`}
              >
                <Lock size={18} /> {loading ? 'Fechando...' : 'FECHAR MÊS'}
              </ButtonPrimary>
            </div>
          </GlassCard>
        </div>

      </div>
    </div>
  );
};

export default CaixaGeral;