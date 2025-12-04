import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocalidade } from '../contexts/LocalidadeContext';
import ModalTrocarLocalidade from '../components/ModalTrocarLocalidade';
import { 
  Home, Layers, Route, MapPin, Users, FileText, BarChart3, Settings, LogOut, Clock,
  ChevronRight, Circle
} from 'lucide-react';

interface AdminLayoutProps {
  children?: React.ReactNode;
}

const Sidebar = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');
  
  const NavItem = ({ icon: Icon, label, path, badge }: any) => (
    <Link
      to={path}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm ${
        isActive(path)
          ? 'bg-blue-500/20 text-blue-600 shadow-sm'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
      }`}
    >
      <Icon size={18} />
      <span className="flex-1">{label}</span>
      {badge && <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{badge}</span>}
    </Link>
  );

  const SectionTitle = ({ title }: { title: string }) => (
    <div className="px-4 pt-4 pb-2 mt-2">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</h3>
    </div>
  );

  return (
    <aside className="w-64 bg-gradient-to-b from-white/95 to-slate-50/95 backdrop-blur-xl border-r border-slate-200/30 min-h-screen p-4 flex flex-col shadow-sm">
      {/* Logo */}
      <div className="px-4 py-4 mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">G</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">GesLeitura</h1>
            <p className="text-xs text-slate-500">v1.0</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="space-y-1 flex-1 overflow-y-auto">
        {/* Dashboard */}
        <SectionTitle title="Menu" />
        <NavItem icon={Home} label="Dashboard" path="/" />

        {/* Operacional */}
        <SectionTitle title="Operacional" />
        <NavItem icon={MapPin} label="Localidades" path="/localidades" />
        <NavItem icon={Layers} label="Seções" path="/secao" />
        <NavItem icon={Route} label="Rotas" path="/rota" />
        <NavItem icon={Users} label="Operadores" path="/operador" />
        <NavItem icon={FileText} label="Leitura Manual" path="/lancamento" />

        {/* Financeiro */}
        <SectionTitle title="Financeiro" />
        <NavItem icon={BarChart3} label="Caixa Geral" path="/caixa-geral" />
        <NavItem icon={Settings} label="Cotas & Sócios" path="/cotas" />

        {/* Relatórios */}
        <SectionTitle title="Relatórios" />
        <NavItem icon={FileText} label="Vendas/Data" path="/relatorios/data" />
        <NavItem icon={FileText} label="Vendas/Mês" path="/relatorios/mes" />

        {/* Admin */}
        <SectionTitle title="Administração" />
        <NavItem icon={Users} label="Usuários" path="/usuarios" />
      </nav>

      {/* Divider */}
      <div className="h-px bg-slate-200/50 my-4" />

      {/* User & Logout */}
      <div className="px-2 space-y-2">
        <div className="px-4 py-3 rounded-lg bg-slate-100/50 border border-slate-200/30">
          <p className="text-xs text-slate-500">Logado como</p>
          <p className="text-sm font-semibold text-slate-900 truncate">User Profile</p>
        </div>
      </div>
    </aside>
  );
};

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { logout, userProfile } = useAuth();
  const { selectedLocalidade, selectedLocalidadeName } = useLocalidade();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      navigate('/login');
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  return (
    <div className="flex bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white/95 backdrop-blur-xl border-b border-slate-200/30 sticky top-0 z-10 shadow-sm">
          <div className="flex justify-between items-center px-8 py-4">
            {/* Esquerda - Logo e Localidade */}
            <div className="flex items-center gap-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">GesLeitura</h2>
                <p className="text-xs text-slate-500">{userProfile?.name} • {userProfile?.role}</p>
              </div>
              
              {/* Localidade Selecionada */}
              {selectedLocalidade && selectedLocalidadeName && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                >
                  <MapPin size={16} className="text-blue-600" />
                  <div className="text-left">
                    <p className="text-xs text-blue-600 font-medium">Localidade</p>
                    <p className="text-sm text-blue-900 font-semibold">{selectedLocalidadeName}</p>
                  </div>
                </button>
              )}
            </div>

            {/* Direita - Relógio e Usuário */}
            <div className="flex items-center gap-6">
              {/* Relógio */}
              <div className="flex items-center gap-2 text-slate-700">
                <Clock size={18} className="text-slate-500" />
                <span className="text-sm font-mono">{currentTime}</span>
              </div>

              {/* Usuário e Logout */}
              <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900">{userProfile?.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{userProfile?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 font-medium text-sm border border-transparent hover:border-red-200"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
          {children}
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
