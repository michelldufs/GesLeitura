import React from 'react';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { LocalidadeProvider } from './contexts/LocalidadeContext';
import AppRoutes from './routes/AppRoutes';

// Configuração do QueryClient com cache otimizado
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos - dados considerados "frescos"
      cacheTime: 10 * 60 * 1000, // 10 minutos - tempo em cache
      refetchOnWindowFocus: false, // Não refetch ao focar janela
      retry: 1, // Tentar 1x em caso de erro
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocalidadeProvider>
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </LocalidadeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;