import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocalidade } from '../contexts/LocalidadeContext';
import MobileLayout from '../layouts/MobileLayout';
import AdminLayout from '../layouts/AdminLayout';

// Critical pages (loaded immediately)
import Login from '../pages/Login';
import SeletorLocalidade from '../pages/SeletorLocalidade';
import Dashboard from '../pages/Dashboard';

// Lazy-loaded pages (code splitting)
const ConfiguracaoTerminal = lazy(() => import('../pages/mobile/ConfiguracaoTerminal'));
const NovaLeituraMobile = lazy(() => import('../pages/mobile/NovaLeituraMobile'));
const HistoricoLeituras = lazy(() => import('../pages/mobile/HistoricoLeituras'));
const LancamentoManual = lazy(() => import('../pages/financeiro/LancamentoManual'));
const CaixaGeral = lazy(() => import('../pages/financeiro/CaixaGeral'));
const ConfiguracaoCotas = lazy(() => import('../pages/financeiro/ConfiguracaoCotas'));
const Despesas = lazy(() => import('../pages/financeiro/Despesas'));
const Usuarios = lazy(() => import('../pages/admin/Usuarios'));
const EditarUsuarioLocalidades = lazy(() => import('../pages/admin/EditarUsuarioLocalidades'));
const Localidades = lazy(() => import('../pages/operacional/Localidades'));
const Secoes = lazy(() => import('../pages/operacional/Secoes'));
const Rotas = lazy(() => import('../pages/operacional/Rotas'));
const Pontos = lazy(() => import('../pages/operacional/Pontos'));
const Operadores = lazy(() => import('../pages/operacional/Operadores'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-slate-600">Carregando...</p>
    </div>
  </div>
);

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
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/mobile/historico" element={<HistoricoLeituras />} />
            <Route path="/mobile/nova-leitura" element={<NovaLeituraMobile />} />
            <Route path="/mobile/setup" element={<ConfiguracaoTerminal />} />
            <Route path="*" element={<Navigate to="/mobile/nova-leitura" replace />} />
          </Routes>
        </Suspense>
      </MobileLayout>
    );
  }

  // Admin/Desktop Routes (all other roles - com localidade já selecionada)
  return (
    <AdminLayout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          
          {/* Operacional - Restrito a Admin, Gerente, Supervisor, Operacional */}
          <Route path="/secao" element={<RequireOperacional><Secoes /></RequireOperacional>} />
          <Route path="/rota" element={<RequireOperacional><Rotas /></RequireOperacional>} />
          <Route path="/ponto" element={<RequireOperacional><Pontos /></RequireOperacional>} />
          <Route path="/operador" element={<RequireOperacional><Operadores /></RequireOperacional>} />
          <Route path="/lancamento" element={<RequireOperacional><LancamentoManual /></RequireOperacional>} />
          
          {/* Relatórios - Restrito a Admin e Financeiro */}
          <Route path="/relatorios" element={<RequireFinanceiro><Placeholder title="Relatórios" /></RequireFinanceiro>} />
          
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
      </Suspense>
    </AdminLayout>
  );
};

export default AppRoutes;
