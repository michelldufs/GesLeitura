import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MobileLayout from '../layouts/MobileLayout';
import AdminLayout from '../layouts/AdminLayout';

// Pages
import Login from '../pages/Login';
import ConfiguracaoTerminal from '../pages/mobile/ConfiguracaoTerminal';
import NovaLeituraMobile from '../pages/mobile/NovaLeituraMobile';
import LancamentoManual from '../pages/financeiro/LancamentoManual';
import CaixaGeral from '../pages/financeiro/CaixaGeral';
import ConfiguracaoCotas from '../pages/financeiro/ConfiguracaoCotas';
import Usuarios from '../pages/admin/Usuarios';

// Placeholder component
const Placeholder: React.FC<{ title: string }> = ({ title }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">{title}</h1>
    <p className="text-gray-600">Esta página será implementada em breve.</p>
  </div>
);

const AppRoutes: React.FC = () => {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Public Routes (Login & Mobile Setup)
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/mobile/setup" element={<ConfiguracaoTerminal />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Mobile Routes (role === 'coleta')
  if (userProfile?.role === 'coleta') {
    return (
      <MobileLayout>
        <Routes>
          <Route path="/app/nova-leitura" element={<NovaLeituraMobile />} />
          <Route path="/app/historico" element={<Placeholder title="Histórico de Leituras" />} />
          <Route path="/mobile/setup" element={<ConfiguracaoTerminal />} />
          <Route path="*" element={<Navigate to="/app/nova-leitura" replace />} />
        </Routes>
      </MobileLayout>
    );
  }

  // Admin/Desktop Routes (all other roles)
  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<Placeholder title="Dashboard" />} />
        
        {/* Operacional */}
        <Route path="/secao" element={<Placeholder title="Gestão de Seções" />} />
        <Route path="/rota" element={<Placeholder title="Gestão de Rotas" />} />
        <Route path="/ponto" element={<Placeholder title="Gestão de Pontos" />} />
        <Route path="/operador" element={<Placeholder title="Gestão de Operadores" />} />
        <Route path="/lancamento" element={<LancamentoManual />} />
        
        {/* Relatórios */}
        <Route path="/relatorios/data" element={<Placeholder title="Relatório por Data" />} />
        <Route path="/relatorios/mes" element={<Placeholder title="Relatório por Mês" />} />
        
        {/* Administração */}
        <Route path="/localidades" element={<Placeholder title="Gestão de Localidades" />} />
        <Route path="/usuarios" element={<Usuarios />} />
        
        {/* Financeiro */}
        <Route path="/caixa-geral" element={<CaixaGeral />} />
        <Route path="/cotas" element={<ConfiguracaoCotas />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AdminLayout>
  );
};

export default AppRoutes;
