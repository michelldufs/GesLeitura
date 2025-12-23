/**
 * Componente de Teste para Correção de Códigos Duplicados
 * ========================================================
 * 
 * Use este componente para testar a correção de códigos
 * em desenvolvimento ANTES de colocar em produção.
 */

import React, { useState } from 'react';
import { corrigirTodosOsCodigos } from '../../services/corrigirCodigosDuplicados';
import { ButtonPrimary, ButtonSecondary, AlertBox, GlassCard, Modal } from '../../components/MacOSDesign';
import { Zap } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const TelaCorrecaoCodigos: React.FC = () => {
  const [executando, setExecutando] = useState(false);
  const [relatorio, setRelatorio] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  const handleCorrigir = async () => {
    if (!window.confirm('⚠️ Esta ação é irreversível! Tem certeza que deseja corrigir os códigos?\n\nFaça um backup antes de continuar!')) {
      return;
    }

    setExecutando(true);
    try {
      console.log('🚀 Iniciando correção...');
      const resultado = await corrigirTodosOsCodigos();
      setRelatorio(resultado);
      setShowModal(true);
    } catch (error) {
      console.error('❌ Erro:', error);
      alert('❌ Erro ao corrigir códigos. Verifique o console.');
    } finally {
      setExecutando(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">🔧 Correção de Códigos Duplicados</h1>
        <p className="text-slate-600">Use esta ferramenta para corrigir automaticamente os códigos duplicados no Firebase</p>
      </div>

      <GlassCard className="p-8 mb-6">
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-900 mb-2">⚠️ AVISO IMPORTANTE</h3>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>✓ Esta ferramenta modificará códigos no Firebase</li>
              <li>✓ A ação é IRREVERSÍVEL</li>
              <li>✓ Faça um backup antes de continuar</li>
              <li>✓ Não feche a página durante a execução</li>
              <li>✓ Monitore o console para erros</li>
            </ul>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">📋 O que será corrigido:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Rotas com códigos duplicados</li>
              <li>✓ Pontos com códigos duplicados</li>
              <li>✓ Operadores com códigos duplicados</li>
              <li>✓ Sequências serão renumeradas automaticamente</li>
            </ul>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">✅ Benefícios:</h3>
            <ul className="text-sm text-green-800 space-y-1">
              <li>✓ Todos os códigos ficarão únicos</li>
              <li>✓ Sequência será sempre correta</li>
              <li>✓ Sistema funcionará perfeitamente</li>
              <li>✓ Nunca mais duplicatas</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <ButtonPrimary
            onClick={handleCorrigir}
            disabled={executando}
            className="flex items-center gap-2"
          >
            <Zap size={20} />
            {executando ? 'Corrigindo...' : 'Corrigir Códigos Agora'}
          </ButtonPrimary>
          <ButtonSecondary onClick={() => setShowModal(false)}>
            Cancelar
          </ButtonSecondary>
        </div>
      </GlassCard>

      {relatorio && (
        <GlassCard className="p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">📊 Relatório de Execução</h2>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700">Rotas Corrigidas</p>
              <p className="text-3xl font-bold text-green-900">{relatorio.rotasRenumeradas}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">Pontos Corrigidos</p>
              <p className="text-3xl font-bold text-blue-900">{relatorio.pontosRenumerados}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-700">Operadores Corrigidos</p>
              <p className="text-3xl font-bold text-purple-900">{relatorio.operadoresRenumerados}</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 mb-6">
            <p className="text-sm text-slate-700">⏱️ Tempo de Execução</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(relatorio.durationMs / 1000)}s
            </p>
          </div>

          {relatorio.erros.length > 0 && (
            <div className="mb-6">
              <AlertBox
                type="warning"
                message={`⚠️ ${relatorio.erros.length} avisos encontrados`}
              />
              <div className="mt-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200 max-h-48 overflow-y-auto">
                {relatorio.erros.map((erro: string, idx: number) => (
                  <p key={idx} className="text-sm text-yellow-800 mb-1">
                    • {erro}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="font-semibold text-slate-900 mb-3">📝 Mudanças Realizadas:</h3>
            <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left text-slate-700">Coleção</th>
                    <th className="px-2 py-1 text-left text-slate-700">De</th>
                    <th className="px-2 py-1 text-left text-slate-700">Para</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorio.mudancas.slice(0, 50).map((mudanca: any, idx: number) => (
                    <tr key={idx} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="px-2 py-1 text-slate-700 font-medium">{mudanca.colecao}</td>
                      <td className="px-2 py-1 text-slate-700">
                        <span className="font-mono text-red-600">{mudanca.codigoAntigo}</span>
                      </td>
                      <td className="px-2 py-1 text-slate-700">
                        <span className="font-mono text-green-600">{mudanca.codigoNovo}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {relatorio.mudancas.length > 50 && (
                <div className="p-3 bg-slate-50 text-center text-sm text-slate-600 border-t border-slate-200">
                  ... e mais {relatorio.mudancas.length - 50} mudanças
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <AlertBox
              type="success"
              message="✅ Correção concluída com sucesso! Recarregue a página para ver os novos códigos."
            />
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default TelaCorrecaoCodigos;
