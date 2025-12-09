import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileText, PlusCircle, LogOut, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocalidade } from '../contexts/LocalidadeContext';
import { logger } from '../utils/logger';

interface MobileLayoutProps {
  children?: React.ReactNode;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, userProfile } = useAuth();
  const { selectedLocalidadeName } = useLocalidade();

  const handleLogout = async () => {
    if (confirm('Deseja realmente sair?')) {
      try {
        await logout();
        navigate('/login');
      } catch (error) {
        logger.error("Erro ao sair:", error);
      }
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div 
      className="flex flex-col h-screen bg-gray-50"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Header Compacto */}
      <header className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-3 shadow-lg flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-emerald-200" />
          <div>
            <p className="text-xs text-emerald-100">Localidade</p>
            <p className="text-sm font-bold">{selectedLocalidadeName || 'Não selecionada'}</p>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          title="Sair"
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-20">
        <div className="flex items-center justify-around px-4 py-3">
          {/* Aba 1 - Histórico */}
          <button
            onClick={() => navigate('/mobile/historico')}
            className={`flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-all ${
              isActive('/mobile/historico')
                ? 'bg-emerald-50 text-emerald-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText size={24} />
            <span className="text-xs font-semibold">Histórico</span>
          </button>

          {/* Aba 2 - Nova Leitura */}
          <button
            onClick={() => navigate('/mobile/nova-leitura')}
            className={`flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-all ${
              isActive('/mobile/nova-leitura')
                ? 'bg-green-50 text-green-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <PlusCircle size={24} />
            <span className="text-xs font-semibold">Nova Leitura</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default MobileLayout;
