import React from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LancamentoManual from './pages/financeiro/LancamentoManual';
import CaixaGeral from './pages/financeiro/CaixaGeral';
import ConfiguracaoCotas from './pages/financeiro/ConfiguracaoCotas';
import ConfiguracaoTerminal from './pages/mobile/ConfiguracaoTerminal';
import Login from './pages/Login';
import Usuarios from './pages/admin/Usuarios';

const Sidebar = () => (
  <aside className="w-64 bg-gray-900 text-white min-h-screen p-4 flex flex-col">
    <div className="text-xl font-bold mb-8">VendingGuard</div>
    <nav className="space-y-2 flex-1">
      <Link to="/" className="block p-2 hover:bg-gray-800 rounded">Dashboard</Link>

      <div className="text-gray-500 text-xs uppercase mt-4 mb-2">Operacional</div>
      <Link to="/secao" className="block p-2 hover:bg-gray-800 rounded">Seção</Link>
      <Link to="/rota" className="block p-2 hover:bg-gray-800 rounded">Rota</Link>
      <Link to="/ponto" className="block p-2 hover:bg-gray-800 rounded">Ponto</Link>
      <Link to="/operador" className="block p-2 hover:bg-gray-800 rounded">Operador</Link>
      <Link to="/lancamento" className="block p-2 hover:bg-gray-800 rounded">Nova Leitura</Link>

      <div className="text-gray-500 text-xs uppercase mt-4 mb-2">Relatórios</div>
      <Link to="/relatorios/data" className="block p-2 hover:bg-gray-800 rounded">Vendas por Data</Link>
      <Link to="/relatorios/mes" className="block p-2 hover:bg-gray-800 rounded">Vendas por Mês</Link>

      <div className="text-gray-500 text-xs uppercase mt-4 mb-2">Administração</div>
      <Link to="/localidades" className="block p-2 hover:bg-gray-800 rounded">Localidade</Link>
      <Link to="/usuarios" className="block p-2 hover:bg-gray-800 rounded">Usuários</Link>

      <div className="text-gray-500 text-xs uppercase mt-4 mb-2">Financeiro</div>
      <Link to="/caixa-geral" className="block p-2 hover:bg-gray-800 rounded">Caixa Geral</Link>
      <Link to="/cotas" className="block p-2 hover:bg-gray-800 rounded">Sócios & Cotas</Link>
    </nav>
  </aside>
);

const Layout: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  const isPublicRoute = location.pathname === '/login' || location.pathname === '/mobile/setup';

  if (isPublicRoute) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/mobile/setup" element={<ConfiguracaoTerminal />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <header className="bg-white p-4 shadow-sm mb-4 flex justify-between items-center">
          <h2 className="text-gray-600">SaaS Gestão Vending v1.0</h2>
          <div className="flex gap-2">
            <button className="text-sm text-blue-600">Perfil</button>
            <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-800 font-medium">Sair</button>
          </div>
        </header>
        <Routes>
          <Route path="/" element={<div className="p-6">Bem-vindo ao sistema. Selecione uma opção no menu.</div>} />
          <Route path="/lancamento" element={<LancamentoManual />} />
          <Route path="/caixa-geral" element={<CaixaGeral />} />
          <Route path="/cotas" element={<ConfiguracaoCotas />} />
          <Route path="/usuarios" element={<Usuarios />} />
        </Routes>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Layout />
      </HashRouter>
    </AuthProvider>
  );
};

export default App;