import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocalidade } from '../contexts/LocalidadeContext';
import MobileLayout from '../layouts/MobileLayout';
import AdminLayout from '../layouts/AdminLayout';

// Pages
import Login from '../pages/Login';
import SeletorLocalidade from '../pages/SeletorLocalidade';
import Dashboard from '../pages/Dashboard';
import ConfiguracaoTerminal from '../pages/mobile/ConfiguracaoTerminal';
import NovaLeituraMobile from '../pages/mobile/NovaLeituraMobile';
import LancamentoManual from '../pages/financeiro/LancamentoManual';
import CaixaGeral from '../pages/financeiro/CaixaGeral';
import ConfiguracaoCotas from '../pages/financeiro/ConfiguracaoCotas';
import Despesas from '../pages/financeiro/Despesas';
import Usuarios from '../pages/admin/Usuarios';
import EditarUsuarioLocalidades from '../pages/admin/EditarUsuarioLocalidades';
import Localidades from '../pages/operacional/Localidades';
import Secoes from '../pages/operacional/Secoes';
import Rotas from '../pages/operacional/Rotas';
import Pontos from '../pages/operacional/Pontos';
import Operadores from '../pages/operacional/Operadores';

// Placeholder component
const Placeholder: React.FC<{ title: string }> = ({ title }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">{title}</h1>
    <p className="text-gray-600">Esta página será implementada em breve.</p>
  </div>
);

const AppRoutes: React.FC = () => {
  const { user, userProfile, loading } = useAuth();
  const { localidadeSelecionada } = useLocalidade();

  // Componentes para restrição de acesso por perfil
  const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (userProfile?.role !== 'admin') {
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  };

  const RequireFinanceiro: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (!['admin', 'gerente', 'financeiro'].includes(userProfile?.role || '')) {
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  };

  const RequireOperacional: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (!['admin', 'gerente', 'supervisor', 'operacional'].includes(userProfile?.role || '')) {
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  };

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

  // Se usuário não selecionou localidade, mostrar seletor
  // Exceção: apenas coleta que já tem localidade definida no device
  if (!localidadeSelecionada && userProfile?.role !== 'coleta') {
    return (
      <Routes>
        <Route path="/" element={<SeletorLocalidade />} />
        <Route path="*" element={<Navigate to="/" replace />} />
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

  // Admin/Desktop Routes (all other roles - com localidade já selecionada)
  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        
        {/* Operacional - Restrito a Admin, Gerente, Supervisor, Operacional */}
        <Route path="/secao" element={<RequireOperacional><Secoes /></RequireOperacional>} />
        <Route path="/rota" element={<RequireOperacional><Rotas /></RequireOperacional>} />
        <Route path="/ponto" element={<RequireOperacional><Pontos /></RequireOperacional>} />
        <Route path="/operador" element={<RequireOperacional><Operadores /></RequireOperacional>} />
        <Route path="/lancamento" element={<RequireOperacional><LancamentoManual /></RequireOperacional>} />
        
        {/* Relatórios - Restrito a Admin e Financeiro */}
        <Route path="/relatorios/data" element={<RequireFinanceiro><Placeholder title="Relatório por Data" /></RequireFinanceiro>} />
        <Route path="/relatorios/mes" element={<RequireFinanceiro><Placeholder title="Relatório por Mês" /></RequireFinanceiro>} />
        
        {/* Administração - Restrito a Admin */}
        <Route path="/localidades" element={<RequireAdmin><Localidades /></RequireAdmin>} />
        <Route path="/usuarios" element={<RequireAdmin><Usuarios /></RequireAdmin>} />
        <Route path="/admin/editar-usuario-localidades" element={<RequireAdmin><EditarUsuarioLocalidades /></RequireAdmin>} />
        
        {/* Financeiro - Restrito a Admin e Financeiro */}
        <Route path="/caixa-geral" element={<RequireFinanceiro><CaixaGeral /></RequireFinanceiro>} />
        <Route path="/cotas" element={<RequireFinanceiro><ConfiguracaoCotas /></RequireFinanceiro>} />
        <Route path="/despesas" element={<RequireFinanceiro><Despesas /></RequireFinanceiro>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AdminLayout>
  );
};

export default AppRoutes;
