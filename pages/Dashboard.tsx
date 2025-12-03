import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BarChart3, Users, MapPin, DollarSign } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { userProfile } = useAuth();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-2">Bem-vindo, {userProfile?.name}!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-blue-100 text-sm">Total de Leituras</p>
              <h3 className="text-3xl font-bold mt-1">0</h3>
            </div>
            <BarChart3 size={40} className="text-blue-200" />
          </div>
          <p className="text-xs text-blue-100">Este mês</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-green-100 text-sm">Receita</p>
              <h3 className="text-3xl font-bold mt-1">R$ 0</h3>
            </div>
            <DollarSign size={40} className="text-green-200" />
          </div>
          <p className="text-xs text-green-100">Este mês</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-purple-100 text-sm">Operadores</p>
              <h3 className="text-3xl font-bold mt-1">0</h3>
            </div>
            <Users size={40} className="text-purple-200" />
          </div>
          <p className="text-xs text-purple-100">Ativos</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-orange-100 text-sm">Localidades</p>
              <h3 className="text-3xl font-bold mt-1">0</h3>
            </div>
            <MapPin size={40} className="text-orange-200" />
          </div>
          <p className="text-xs text-orange-100">Cadastradas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Últimas Leituras</h2>
          <div className="text-center py-12 text-gray-400">
            <BarChart3 size={48} className="mx-auto mb-3 opacity-50" />
            <p>Nenhuma leitura registrada ainda</p>
            <p className="text-sm mt-2">Comece cadastrando localidades e operadores</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Acesso Rápido</h2>
          <div className="space-y-3">
            <a href="#/localidades" className="block p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition">
              <h3 className="font-semibold text-blue-900">Cadastrar Localidades</h3>
              <p className="text-sm text-blue-600">Configure as localidades do sistema</p>
            </a>
            <a href="#/secao" className="block p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition">
              <h3 className="font-semibold text-purple-900">Cadastrar Seções</h3>
              <p className="text-sm text-purple-600">Organize por seções</p>
            </a>
            <a href="#/rota" className="block p-4 bg-green-50 hover:bg-green-100 rounded-lg transition">
              <h3 className="font-semibold text-green-900">Cadastrar Rotas</h3>
              <p className="text-sm text-green-600">Defina as rotas de coleta</p>
            </a>
            <a href="#/lancamento" className="block p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition">
              <h3 className="font-semibold text-orange-900">Nova Leitura</h3>
              <p className="text-sm text-orange-600">Registrar coleta manual</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
