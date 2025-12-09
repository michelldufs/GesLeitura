import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocalidade } from '../contexts/LocalidadeContext';
import ModalTrocarLocalidade from '../components/ModalTrocarLocalidade';
import { logger } from '../utils/logger';
import {
  Home, Layers, Route, MapPin, Users, FileText, BarChart3, Settings, LogOut, Clock,
  ChevronRight, Circle, DollarSign
} from 'lucide-react';

interface AdminLayoutProps {
  children?: React.ReactNode;
}

const Sidebar = ({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) => {
  const location = useLocation();
  const { userProfile } = useAuth();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const NavItem = ({ icon: Icon, label, path, badge }: any) => (
    <Link
      to={path}
      onClick={onClose}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm ${
        isActive(path)
          ? 'bg-emerald-50 text-emerald-700 shadow-sm'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      <Icon size={18} />
      <span className="flex-1">{label}</span>
      {badge && <span className="bg-rose-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{badge}</span>}
    </Link>
  );

  const SectionTitle = ({ title }: { title: string }) => (
    <div className="px-4 pt-4 pb-2 mt-2">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</h3>
    </div>
  );

  // Funções auxiliares para verificar permissões
  const canAccessOperacional = ['admin', 'gerente', 'supervisor', 'operacional'].includes(userProfile?.role || '');
  const canAccessFinanceiro = ['admin', 'gerente', 'financeiro'].includes(userProfile?.role || '');
  const canAccessAdmin = userProfile?.role === 'admin';

  const sidebarClasses = `w-64 sm:w-64 md:w-64 bg-white border-r border-gray-200 min-h-screen p-4 flex flex-col shadow-sm ${
    isOpen ? 'fixed left-0 top-0 z-40 h-screen' : 'hidden sm:flex'
  }`;

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 sm:hidden"
          onClick={onClose}
        />
      )}
      <aside className={sidebarClasses}>
        {/* Navigation */}
        <nav className="space-y-1 flex-1 overflow-y-auto mt-2">

          {/* Operacional - Apenas para admin, gerente, supervisor, operacional */}
          {canAccessOperacional && (
            <>
              <SectionTitle title="Operacional" />
              {canAccessAdmin && <NavItem icon={MapPin} label="Localidades" path="/localidades" />}
              <NavItem icon={Layers} label="Seções" path="/secao" />
              <NavItem icon={Route} label="Rotas" path="/rota" />
              <NavItem icon={MapPin} label="Pontos" path="/ponto" />
              <NavItem icon={Users} label="Operadores" path="/operador" />
              <NavItem icon={FileText} label="Leitura Manual" path="/lancamento" />
            </>
          )}

          {/* Financeiro - Apenas para admin e financeiro */}
          {canAccessFinanceiro && (
            <>
              <SectionTitle title="Financeiro" />
              <NavItem icon={BarChart3} label="Caixa Geral" path="/caixa-geral" />
              <NavItem icon={Settings} label="Cotas & Sócios" path="/cotas" />
              <NavItem icon={DollarSign} label="Despesas" path="/despesas" />

              <SectionTitle title="Relatórios" />
              <NavItem icon={Home} label="Painel" path="/" />
              <NavItem icon={FileText} label="Relatórios" path="/relatorios" />
            </>
          )}

          {/* Admin - Apenas para admin */}
          {canAccessAdmin && (
            <>
              <SectionTitle title="Administração" />
              <NavItem icon={Users} label="Usuários" path="/usuarios" />
            </>
          )}
        </nav>

        {/* Divider */}
        <div className="h-px bg-gray-200 my-4" />

        {/* User & Logout */}
        <div className="px-2 space-y-2">
          <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200">
            <p className="text-xs text-gray-500">Logado como</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{userProfile?.name || 'Usuário'}</p>
          </div>
        </div>
      </aside>
    </>
  );
};

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { logout, userProfile } = useAuth();
  const { selectedLocalidade, selectedLocalidadeName } = useLocalidade();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Atualizar relógio a cada segundo
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      setCurrentTime(timeString);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      logger.error("Erro ao sair:", error);
    }
  };

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center justify-between px-4 sm:px-6 md:px-8 py-3 sm:py-4 gap-4 sm:gap-6">
            {/* Menu Hamburger - Mobile */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="sm:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex-1" />

            {/* Direita - Relógio, Localidade e Usuário */}
            <div className="flex items-center gap-3 sm:gap-4 md:gap-6 flex-wrap sm:flex-nowrap justify-end">
              {/* Relógio - Hidden em mobile extra pequeno */}
              <div className="hidden sm:flex items-center gap-2 text-gray-700">
                <Clock size={16} className="text-gray-500 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-mono">{currentTime}</span>
              </div>

              {/* Localidade entre relógio e usuário - Adaptável */}
              {selectedLocalidade && selectedLocalidadeName && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="hidden md:flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors cursor-pointer text-xs md:text-sm"
                >
                  <MapPin size={14} className="text-emerald-600 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-xs text-emerald-600 font-medium">Localidade</p>
                    <p className="text-xs md:text-sm text-emerald-900 font-semibold">{selectedLocalidadeName}</p>
                  </div>
                </button>
              )}

              {/* Usuário e Logout - Adaptável */}
              <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 md:pl-6 border-l border-gray-200">
                <div className="text-right hidden sm:block">
                  <p className="text-xs sm:text-sm font-medium text-gray-900">{userProfile?.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{userProfile?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-gray-600 hover:bg-rose-50 hover:text-rose-600 transition-all duration-200 font-medium text-xs sm:text-sm border border-transparent hover:border-rose-200"
                >
                  <LogOut size={14} className="sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content - Responsive padding */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 md:p-8">
            {children}
          </div>
        </div>

        {/* Modal de Trocar Localidade */}
        <ModalTrocarLocalidade
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </main>
    </div>
  );
};

export default AdminLayout;
