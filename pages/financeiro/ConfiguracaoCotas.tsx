import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { getActiveCollection, saveCota, softDelete } from '../../services/operacionalService';
import { useLocation } from 'react-router-dom';
import { Cota } from '../../types.ts';
import { GlassCard, ButtonPrimary, ButtonSecondary, InputField, AlertBox, Modal, PageHeader, Badge } from '../../components/MacOSDesign';
import { Plus, Edit2, Trash2, Users } from 'lucide-react';

interface CotaForm {
  nome: string;
  porcentagem: number;
  localidadeId: string;
  participaPrejuizo: boolean;
}

const ConfiguracaoCotas = () => {
  const { userProfile } = useAuth();
  const [cotas, setCotas] = useState<Cota[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [formData, setFormData] = useState({
    nome: '',
    porcentagem: 0,
    localidadeId: '',
    participaPrejuizo: false
  });
  const { register, handleSubmit, reset, formState: { errors }, watch, setValue } = useForm<any>();

  const loadCotas = () => getActiveCollection('cotas').then((items) => setCotas(items as Cota[]));

  useEffect(() => {
    loadCotas();
  }, []);

  const handleOpenModal = () => {
    setFormData({ nome: '', porcentagem: 0, localidadeId: '', participaPrejuizo: false });
    setEditingId(null);
    reset();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ nome: '', porcentagem: 0, localidadeId: '', participaPrejuizo: false });
    setEditingId(null);
    reset();
  };

  const onSubmit = async () => {
    if (!userProfile || !formData.nome.trim()) return;
    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      await saveCota({ ...formData, saldoAcumulado: 0, active: true }, userProfile.uid);
      setMessageType('success');
      setMessage('Cota criada com sucesso!');
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
    if (!userProfile || !window.confirm('Deseja realmente desativar esta cota?')) return;
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

  const isAuthorized = userProfile && ['admin', 'gerente', 'socio'].includes(userProfile.role);

  return (
    <div className="w-full">
      <PageHeader
        title="Configuração de Sócios e Cotas"
        subtitle="Gerencie todas as cotas e sócios do sistema"
        action={
          <ButtonPrimary
            onClick={handleOpenModal}
            disabled={!isAuthorized}
            className="flex items-center gap-2"
          >
            <Plus size={20} /> Nova Cota
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

      <GlassCard className="p-8">
        <h2 className="text-2xl font-semibold text-slate-900 mb-6">Sócios Ativos</h2>

        {cotas.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 text-lg">Nenhuma cota cadastrada ainda.</p>
            <p className="text-slate-400 text-sm mt-2">Clique em "Nova Cota" para criar a primeira.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/50">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 border-b border-slate-200/50">
                <tr>
                  <th className="px-2 py-1 font-semibold text-slate-700 text-xs uppercase tracking-wide">Nome</th>
                  <th className="px-2 py-1 font-semibold text-slate-700 text-xs uppercase tracking-wide">Porcentagem</th>
                  <th className="px-2 py-1 font-semibold text-slate-700 text-xs uppercase tracking-wide">Saldo</th>
                  <th className="px-2 py-1 font-semibold text-slate-700 text-xs uppercase tracking-wide">Prejuízo</th>
                  <th className="px-2 py-1 font-semibold text-slate-700 text-xs uppercase tracking-wide text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {cotas.map((c: Cota) => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-2 py-1 font-medium text-slate-900 flex items-center gap-2">
                      <div className="p-1 bg-indigo-100/50 rounded-lg">
                        <Users className="text-indigo-600" size={16} />
                      </div>
                      {c.nome}
                    </td>
                    <td className="px-2 py-1 text-slate-600 font-semibold">{c.porcentagem}%</td>
                    <td className={`px-2 py-1 font-semibold ${c.saldoAcumulado < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      R$ {(c.saldoAcumulado || 0).toFixed(2)}
                    </td>
                    <td className="px-2 py-1">
                      <Badge variant={c.participaPrejuizo ? 'warning' : 'secondary'}>
                        {c.participaPrejuizo ? 'Sim' : 'Não'}
                      </Badge>
                    </td>
                    <td className="px-2 py-1 text-right">
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={!isAuthorized}
                        className="text-red-500 hover:text-red-700 font-medium transition-colors flex items-center justify-end gap-1 disabled:opacity-50"
                      >
                        <Trash2 size={16} /> Desativar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title="Nova Cota"
        actions={
          <div className="flex gap-3">
            <ButtonPrimary onClick={onSubmit} disabled={loading} type="submit">
              {loading ? 'Salvando...' : 'Criar Cota'}
            </ButtonPrimary>
            <ButtonSecondary onClick={handleCloseModal}>
              Cancelar
            </ButtonSecondary>
          </div>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-5">
          <InputField
            label="Nome do Sócio"
            placeholder="Ex: João Silva"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            disabled={!isAuthorized}
            required
          />

          <InputField
            label="Porcentagem (%)"
            type="number"
            step="0.01"
            min="0"
            max="100"
            placeholder="Ex: 25.00"
            value={formData.porcentagem}
            onChange={(e) => setFormData({ ...formData, porcentagem: parseFloat(e.target.value) })}
            disabled={!isAuthorized}
            required
          />

          <InputField
            label="Localidade ID"
            placeholder="Ex: loc_123"
            value={formData.localidadeId}
            onChange={(e) => setFormData({ ...formData, localidadeId: e.target.value })}
            disabled={!isAuthorized}
            required
          />

          <div className="flex items-center gap-3 p-4 bg-slate-50/50 rounded-lg border border-slate-200/50">
            <input
              type="checkbox"
              id="participaPrejuizo"
              checked={formData.participaPrejuizo}
              onChange={(e) => setFormData({ ...formData, participaPrejuizo: e.target.checked })}
              disabled={!isAuthorized}
              className="h-5 w-5 rounded border-slate-300 text-blue-600 cursor-pointer"
            />
            <label htmlFor="participaPrejuizo" className="text-sm font-medium text-slate-700 cursor-pointer">
              Este sócio participa do prejuízo?
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ConfiguracaoCotas;