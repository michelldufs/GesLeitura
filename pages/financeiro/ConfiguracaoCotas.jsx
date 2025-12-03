import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { getActiveCollection, saveCota, softDelete } from '../../services/operacionalService';
import { Trash2, UserPlus } from 'lucide-react';

const ConfiguracaoCotas = () => {
  const { userProfile } = useAuth();
  const [cotas, setCotas] = useState([]);
  const { register, handleSubmit, reset } = useForm();

  const loadCotas = () => getActiveCollection('cotas').then(setCotas);

  useEffect(() => { loadCotas(); }, []);

  const onSubmit = async (data) => {
    if (!userProfile) return;
    try {
      await saveCota({ ...data, saldoAcumulado: 0 }, userProfile.uid);
      reset();
      loadCotas();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    if (!userProfile || !window.confirm("Remover cota?")) return;
    await softDelete('cotas', id, userProfile.uid);
    loadCotas();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Configuração de Sócios e Cotas</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form */}
        <div className="bg-white p-6 rounded shadow h-fit">
          <h2 className="font-bold mb-4 flex items-center gap-2"><UserPlus size={20}/> Novo Sócio</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm block">Nome</label>
              <input {...register('nome', { required: true })} className="border w-full p-2 rounded" />
            </div>
            <div>
              <label className="text-sm block">Porcentagem (%)</label>
              <input type="number" step="0.01" {...register('porcentagem', { required: true, valueAsNumber: true })} className="border w-full p-2 rounded" />
            </div>
            <div>
               <label className="text-sm block">Localidade ID</label>
               <input {...register('localidadeId', { required: true })} className="border w-full p-2 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" {...register('participaPrejuizo')} id="pp" />
              <label htmlFor="pp" className="text-sm">Participa do Prejuízo?</label>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-bold">Adicionar</button>
          </form>
        </div>

        {/* List */}
        <div className="md:col-span-2 bg-white p-6 rounded shadow">
          <h2 className="font-bold mb-4">Sócios Ativos</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2">Nome</th>
                <th className="p-2">%</th>
                <th className="p-2">Saldo Acumulado</th>
                <th className="p-2">Prejuízo</th>
                <th className="p-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {cotas.map(c => (
                <tr key={c.id} className="border-b">
                  <td className="p-2">{c.nome}</td>
                  <td className="p-2">{c.porcentagem}%</td>
                  <td className={`p-2 ${c.saldoAcumulado < 0 ? 'text-red-500' : 'text-green-600'}`}>
                    R$ {c.saldoAcumulado ? c.saldoAcumulado.toFixed(2) : '0.00'}
                  </td>
                  <td className="p-2">{c.participaPrejuizo ? 'Sim' : 'Não'}</td>
                  <td className="p-2">
                    <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ConfiguracaoCotas;