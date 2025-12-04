import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { getActiveCollection, saveCota, softDelete } from '../../services/operacionalService';
import { UserPlus, Plus } from 'lucide-react';
import { Cota } from '../../types';

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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CotaForm>();

  const loadCotas = () => getActiveCollection('cotas').then(setCotas);

  useEffect(() => {
    loadCotas();
  }, []);

  const onSubmit = async (data: CotaForm) => {
    if (!userProfile) return;
    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      await saveCota({ ...data, saldoAcumulado: 0 }, userProfile.uid);
      setMessageType('success');
      setMessage('Cota criada com sucesso!');
      reset();
      setShowModal(false);
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <UserPlus className="text-indigo-600" size={28} />
          Configuração de Sócios e Cotas
        </h1>
        <button
          onClick={() => setShowModal(true)}
          disabled={!isAuthorized}
          className={`px-4 py-2 rounded text-white font-semibold transition-colors ${
            isAuthorized
              ? 'bg-indigo-600 hover:bg-indigo-700'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          + Nova Cota
        </button>
      </div>

      {!isAuthorized && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded mb-6">
          Seu perfil ({userProfile?.role}) não possui permissão para gerenciar cotas.
        </div>
      )}

      {message && (
        <div className={`mb-6 p-4 rounded ${messageType === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
          {message}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Sócios Ativos</h2>

        {cotas.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhuma cota cadastrada ainda.</p>
            <p className="text-sm">Clique em "+ Nova Cota" para criar a primeira.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-gray-700">
              <thead className="text-xs text-gray-600 uppercase bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Porcentagem</th>
                  <th className="px-4 py-3">Saldo Acumulado</th>
                  <th className="px-4 py-3">Participa Prejuízo</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {cotas.map((c: Cota) => (
                  <tr key={c.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.nome}</td>
                    <td className="px-4 py-3">{c.porcentagem}%</td>
                    <td className={`px-4 py-3 font-semibold ${c.saldoAcumulado < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      R$ {(c.saldoAcumulado || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        c.participaPrejuizo ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {c.participaPrejuizo ? 'Sim' : 'Não'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={!isAuthorized}
                        className="text-red-600 hover:text-red-800 font-medium text-sm disabled:opacity-50"
                      >
                        Desativar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-800">Nova Cota</h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Sócio</label>
                  <input
                    type="text"
                    {...register('nome', { required: 'Nome é obrigatório' })}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Ex: João Silva"
                  />
                  {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Porcentagem (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('porcentagem', { required: 'Porcentagem é obrigatória', valueAsNumber: true, min: 0, max: 100 })}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Ex: 25.00"
                  />
                  {errors.porcentagem && <p className="text-red-500 text-xs mt-1">{errors.porcentagem.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Localidade ID</label>
                  <input
                    type="text"
                    {...register('localidadeId', { required: 'Localidade é obrigatória' })}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Ex: loc_123"
                  />
                  {errors.localidadeId && <p className="text-red-500 text-xs mt-1">{errors.localidadeId.message}</p>}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register('participaPrejuizo')}
                    id="participaPrejuizo"
                    className="h-4 w-4"
                  />
                  <label htmlFor="participaPrejuizo" className="text-sm font-medium text-gray-700">
                    Participa do Prejuízo?
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex-1 py-2 px-4 rounded text-white font-bold transition-colors ${
                      loading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {loading ? 'Salvando...' : 'Criar Cota'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); reset(); }}
                    className="flex-1 py-2 px-4 rounded border border-gray-300 font-bold hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfiguracaoCotas;