import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalidade } from '../../contexts/LocalidadeContext';
import { getActiveCollection, saveCota, softDelete, updateCota } from '../../services/operacionalService';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useLocation } from 'react-router-dom';
import { Cota } from '../../types.ts';
import { GlassCard, ButtonPrimary, ButtonSecondary, InputField, AlertBox, Modal, PageHeader, Badge } from '../../components/MacOSDesign';
import { Plus, Edit2, Trash2, Users, MapPin } from 'lucide-react';

interface CotaForm {
  nome: string;
  porcentagem: number;
  localidadeId: string;
  participaPrejuizo: boolean;
}

const ConfiguracaoCotas = () => {
  const { userProfile } = useAuth();
  const { selectedLocalidade, selectedLocalidadeName } = useLocalidade();
  const [cotas, setCotas] = useState<Cota[]>([]);
  const [localidades, setLocalidades] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'warning' | ''>('');
  const [formData, setFormData] = useState({
    nome: '',
    porcentagem: 0,
    localidadeId: '',
    participaPrejuizo: false,
    observacao: ''
  });
  const { register, handleSubmit, reset, formState: { errors }, watch, setValue } = useForm<any>();

  const loadCotas = async () => {
    try {
      // Carregar TODAS as cotas (ativas e inativas)
      const snapshot = await getDocs(collection(db, 'cotas'));
      const cotasList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Cota[];

      // Debug: Ver duplicatas
      const nomesCounts: Record<string, number> = {};
      cotasList.forEach(c => {
        const key = `${c.nome}-${c.localidadeId}`;
        nomesCounts[key] = (nomesCounts[key] || 0) + 1;
      });
      const duplicatas = Object.entries(nomesCounts).filter(([_, count]) => (count as number) > 1);
      if (duplicatas.length > 0) {
        console.warn('⚠️ COTAS DUPLICADAS encontradas:', duplicatas);
        console.table(cotasList.map(c => ({ id: c.id, nome: c.nome, active: c.active, porcentagem: c.porcentagem })));
      }

      setCotas(cotasList);

      // Calcular porcentagem total por localidade (apenas ativas)
      const totalPorLocalidade = cotasList
        .filter(c => c.active !== false)
        .reduce((acc: any, cota: Cota) => {
          if (!acc[cota.localidadeId]) acc[cota.localidadeId] = 0;
          acc[cota.localidadeId] += cota.porcentagem;
          return acc;
        }, {});
      return totalPorLocalidade;
    } catch (error) {
      console.error('Erro ao carregar cotas:', error);
    }
  };

  const loadLocalidades = async () => {
    try {
      const q = query(collection(db, 'localidades'), where('active', '==', true));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLocalidades(items);
    } catch (error) {
      console.error('Erro ao carregar localidades:', error);
    }
  };

  useEffect(() => {
    loadCotas();
    loadLocalidades();
  }, []);

  const handleOpenModal = (cota?: Cota) => {
    if (cota) {
      // Modo edição
      setFormData({
        nome: cota.nome,
        porcentagem: cota.porcentagem,
        localidadeId: cota.localidadeId,
        participaPrejuizo: cota.participaPrejuizo || false,
        observacao: (cota as any).observacao || ''
      });
      setEditingId(cota.id);
    } else {
      // Modo novo - Auto-preencher com localidade selecionada
      setFormData({
        nome: '',
        porcentagem: 0,
        localidadeId: selectedLocalidade || '',
        participaPrejuizo: false,
        observacao: ''
      });
      setEditingId(null);
    }
    reset();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ nome: '', porcentagem: 0, localidadeId: '', participaPrejuizo: false, observacao: '' });
    setEditingId(null);
    reset();
  };

  const onSubmit = async () => {
    if (!userProfile || !formData.nome.trim()) return;

    // Validar se há localidade selecionada
    if (!formData.localidadeId) {
      setMessageType('error');
      setMessage('⚠️ Selecione uma localidade no topo da página antes de criar uma cota!');
      return;
    }

    // Validar porcentagem (permitir 0% para desativar sócios)
    if (formData.porcentagem < 0 || formData.porcentagem > 100) {
      setMessageType('error');
      setMessage('A porcentagem deve estar entre 0% e 100%!');
      return;
    }

    // Calcular total de porcentagem da localidade (excluindo a cota sendo editada e apenas ATIVAS)
    const totalPorcentagemLocalidade = cotas
      .filter(c =>
        c.localidadeId === formData.localidadeId &&
        c.id !== editingId &&
        (c.active === true || c.active === undefined) // Apenas cotas ATIVAS
      )
      .reduce((sum, c) => sum + c.porcentagem, 0);

    const novoTotal = totalPorcentagemLocalidade + formData.porcentagem;

    if (novoTotal > 100) {
      setMessageType('error');
      setMessage(`Erro: A soma das porcentagens desta localidade ficaria ${novoTotal.toFixed(2)}%. O máximo permitido é 100%!`);
      return;
    }

    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      if (editingId) {
        // Editar cota existente - usar updateCota para não criar duplicata
        const cotaData = {
          nome: formData.nome.toUpperCase(),
          porcentagem: formData.porcentagem,
          localidadeId: formData.localidadeId,
          participaPrejuizo: formData.participaPrejuizo,
          observacao: formData.observacao,
          active: true
        };
        await updateCota(editingId, cotaData, userProfile.uid);
        setMessageType('success');
        setMessage('Cota atualizada com sucesso!');
      } else {
        // Criar nova cota
        const cotaData = {
          ...formData,
          nome: formData.nome.toUpperCase(),
          saldoAcumulado: 0,
          observacao: formData.observacao,
          active: true
        };
        await saveCota(cotaData, userProfile.uid);
        setMessageType('success');
        setMessage('Cota criada com sucesso!');
      }

      handleCloseModal();
      loadCotas();
    } catch (e: any) {
      console.error(e);
      setMessageType('error');
      setMessage(e?.message || 'Erro ao salvar cota');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!userProfile) return;

    // Validar se a cota tem porcentagem 0%
    const cota = cotas.find(c => c.id === id);
    if (!cota) return;

    if (cota.porcentagem > 0) {
      setMessageType('error');
      setMessage(`⚠️ Não é possível desativar esta cota! A porcentagem deve ser 0% antes de desativar. Atualmente está em ${cota.porcentagem}%.`);
      return;
    }

    if (!window.confirm('Deseja realmente desativar esta cota?')) return;

    try {
      await softDelete('cotas', id, userProfile.uid);
      setMessageType('success');
      setMessage('Cota desativada com sucesso!');
      loadCotas();
    } catch (e: any) {
      setMessageType('error');
      setMessage(e?.message || 'Erro ao desativar cota');
    }
  };

  const limparDuplicatas = async () => {
    if (!userProfile || !window.confirm('🧹 LIMPAR DUPLICATAS?\n\nEsta ação vai remover cotas duplicadas do banco, mantendo apenas a versão mais recente de cada sócio.\n\nDeseja continuar?')) return;

    setLoading(true);
    setMessage('Limpando duplicatas...');
    setMessageType('');

    try {
      const snapshot = await getDocs(collection(db, 'cotas'));
      const todasCotas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Cota[];

      // Agrupar por nome+localidade
      const grupos: { [key: string]: Cota[] } = {};
      todasCotas.forEach(cota => {
        const key = `${cota.nome}-${cota.localidadeId}`;
        if (!grupos[key]) grupos[key] = [];
        grupos[key].push(cota);
      });

      let removidos = 0;

      // Para cada grupo com duplicatas
      for (const [key, cotasGrupo] of Object.entries(grupos)) {
        if (cotasGrupo.length > 1) {
          // Ordenar: ativas primeiro, depois por timestamp se houver
          const ordenadas = cotasGrupo.sort((a, b) => {
            if ((a.active === true || a.active === undefined) && b.active === false) return -1;
            if (a.active === false && (b.active === true || b.active === undefined)) return 1;
            return 0;
          });

          // Manter a primeira (ativa se houver), remover o resto
          const manter = ordenadas[0];
          const remover = ordenadas.slice(1);

          console.log(`Grupo ${key}: Mantendo`, manter.id, 'Removendo', remover.map(c => c.id));

          for (const cotaRemover of remover) {
            const docRef = doc(db, 'cotas', cotaRemover.id);
            await updateDoc(docRef, { active: false, _duplicata_removida: true });
            removidos++;
          }
        }
      }

      setMessageType('success');
      setMessage(`✅ Limpeza concluída! ${removidos} duplicata(s) removida(s).`);
      await loadCotas();
    } catch (e: any) {
      console.error('Erro ao limpar duplicatas:', e);
      setMessageType('error');
      setMessage('Erro ao limpar duplicatas: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReativar = async (id: string) => {
    if (!userProfile || !window.confirm('Deseja realmente reativar esta cota?')) return;
    try {
      // Usar updateDoc diretamente para apenas atualizar o campo active
      const docRef = doc(db, 'cotas', id);
      await updateDoc(docRef, { active: true });

      setMessageType('success');
      setMessage('Cota reativada com sucesso!');

      // Forçar reload completo
      await loadCotas();
    } catch (e: any) {
      setMessageType('error');
      setMessage(e?.message || 'Erro ao reativar cota');
    }
  };

  const isAuthorized = userProfile && ['admin', 'gerente', 'socio'].includes(userProfile.role);

  return (
    <div className="w-full">
      <PageHeader
        title="Gestão de Contas"
        subtitle="Gerencie todas as contas e sócios do sistema"
        action={
          <ButtonPrimary
            onClick={() => handleOpenModal()}
            disabled={!isAuthorized}
            className="flex items-center gap-2"
          >
            <Plus size={20} /> Nova Conta
          </ButtonPrimary>
        }
      />

      {!isAuthorized && (
        <AlertBox
          type="warning"
          message={`Seu perfil (${userProfile?.role}) não possui permissão para gerenciar cotas.`}
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

      {/* Tabela de Contas */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-sm font-semibold text-gray-700">Contas Cadastradas</h2>
          <div className="flex gap-2">
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 shadow-sm">
              {cotas.filter(c => (c.active === true || c.active === undefined) && c.porcentagem > 0).length} ativas
            </span>
            <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-200 shadow-sm">
              {cotas.filter(c => (c.active === true || c.active === undefined) && c.porcentagem === 0).length} inativas
            </span>
          </div>
        </div>

        {cotas.filter(c => c.active === true || c.active === undefined).length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto text-gray-300 mb-4" size={32} />
            <p className="text-gray-500 text-sm">Nenhuma conta cadastrada ainda.</p>
            <p className="text-gray-400 text-xs mt-2">Clique em "Nova Conta" para criar a primeira.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide">Nome</th>
                  <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide">Localidade</th>
                  <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide">Porcentagem</th>
                  <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide">Saldo</th>
                  <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide">Prejuízo</th>
                  <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wide text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cotas
                  .filter(c => c.active === true || c.active === undefined)
                  .sort((a, b) => b.porcentagem - a.porcentagem) // Ordenar: maiores % primeiro
                  .map((c: Cota) => {
                    const localidade = localidades.find(l => l.id === c.localidadeId);
                    const isAtiva = c.active === true || c.active === undefined;
                    const podeDesativar = c.porcentagem === 0;
                    return (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2 font-medium text-gray-700 text-xs">
                          {c.nome}
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-xs text-gray-600">{localidade?.nome || 'N/A'}</span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-semibold ${c.porcentagem === 0 ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{c.porcentagem}%</span>
                            {(c as any).observacao && (
                              <span
                                className="text-[8px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded cursor-help font-bold"
                                title={(c as any).observacao}
                              >
                                OBS
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`px-4 py-2 text-xs font-semibold ${c.saldoAcumulado < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          R$ {(c.saldoAcumulado || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${c.participaPrejuizo
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                            {c.participaPrejuizo ? 'SIM' : 'NÃO'}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${c.porcentagem > 0
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-gray-50 text-gray-400 border-gray-100'
                            }`}>
                            {c.porcentagem > 0 ? 'ATIVO' : 'INATIVO'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => handleOpenModal(c)}
                            disabled={!isAuthorized}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                            title="Editar conta"
                          >
                            <Edit2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Compacto */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingId ? "Editar Conta" : "Nova Conta"}
        size="sm"
        actions={
          <div className="flex gap-2">
            <ButtonSecondary onClick={handleCloseModal}>
              Cancelar
            </ButtonSecondary>
            <ButtonPrimary onClick={onSubmit} disabled={loading} type="submit">
              {loading ? 'Salvando...' : (editingId ? 'Salvar' : 'Criar')}
            </ButtonPrimary>
          </div>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-gray-600 mb-1">Nome do Sócio *</label>
            <input
              type="text"
              placeholder="Ex: JOÃO SILVA"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value.toUpperCase() })}
              disabled={!isAuthorized}
              required
              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-slate-100 uppercase"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-gray-600 mb-1">Localidade *</label>
            {editingId ? (
              // Modo edição: apenas exibir a localidade (não permitir alteração)
              <div className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 text-gray-600 flex items-center gap-1.5">
                <MapPin size={12} className="text-blue-500" />
                <span className="font-medium">
                  {localidades.find(l => l.id === formData.localidadeId)?.nome || 'N/A'}
                </span>
              </div>
            ) : (
              // Modo criação: mostrar apenas a localidade atual (fixa)
              <>
                {selectedLocalidade ? (
                  <div className="w-full px-2 py-1.5 text-xs border border-blue-200 rounded-lg bg-emerald-50 text-blue-700 flex items-center gap-1.5">
                    <MapPin size={12} className="text-emerald-600" />
                    <span className="font-semibold">{selectedLocalidadeName}</span>
                  </div>
                ) : (
                  <div className="w-full px-2 py-1.5 text-xs border border-red-200 rounded-lg bg-red-50 text-red-700">
                    ⚠️ Selecione uma localidade no topo da página antes de criar uma cota
                  </div>
                )}
              </>
            )}
            <p className="text-[9px] text-gray-500 mt-0.5 italic">
              {editingId ? 'A localidade não pode ser alterada após criação' : 'Cota será vinculada à localidade selecionada'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 mb-1">Porcentagem (%) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="25.00"
                value={formData.porcentagem}
                onChange={(e) => {
                  const valor = parseFloat(e.target.value) || 0;
                  if (valor > 100) {
                    setMessageType('warning');
                    setMessage('⚠️ Porcentagem não pode ser maior que 100%!');
                  } else {
                    setMessage('');
                  }
                  setFormData({ ...formData, porcentagem: valor });
                }}
                disabled={!isAuthorized}
                required
                className={`w-full px-2 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-slate-100 ${formData.porcentagem > 100 ? 'border-red-500 bg-red-50' : 'border-slate-300'
                  }`}
              />
              {formData.localidadeId && (() => {
                const totalAtual = cotas
                  .filter(c =>
                    c.localidadeId === formData.localidadeId &&
                    c.id !== editingId &&
                    (c.active === true || c.active === undefined) // Apenas cotas ATIVAS
                  )
                  .reduce((sum, c) => sum + c.porcentagem, 0);
                const novoTotal = totalAtual + (formData.porcentagem || 0);
                const restante = 100 - novoTotal;
                return (
                  <p className={`text-[8px] mt-0.5 font-semibold ${novoTotal > 100 ? 'text-red-600' : novoTotal === 100 ? 'text-green-600' : 'text-gray-500'
                    }`}>
                    Total: {novoTotal.toFixed(2)}% {restante >= 0 ? `(${restante.toFixed(2)}% disponível)` : '(EXCEDEU!)'}
                  </p>
                );
              })()}
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-slate-100 transition-colors w-full">
                <input
                  type="checkbox"
                  checked={formData.participaPrejuizo}
                  onChange={(e) => setFormData({ ...formData, participaPrejuizo: e.target.checked })}
                  disabled={!isAuthorized}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 cursor-pointer"
                />
                <span className="text-[10px] font-medium text-gray-600">Participa prejuízo</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-gray-600 mb-1">Observação</label>
            <textarea
              placeholder="Ex: Aposentado em 08/12/2025, Suspenso temporariamente, etc."
              value={formData.observacao}
              onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
              disabled={!isAuthorized}
              rows={2}
              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-slate-100 resize-none"
            />
            <p className="text-[8px] text-gray-500 mt-0.5 italic">
              Use para registrar: aposentadorias, suspensões, transferências, etc.
            </p>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ConfiguracaoCotas;