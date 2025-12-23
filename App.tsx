import React from 'react';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { LocalidadeProvider } from './contexts/LocalidadeContext';
import { OperacionalProvider } from './contexts/OperacionalContext';
import AppRoutes from './routes/AppRoutes';
import ErrorBoundary from './components/ErrorBoundary';

// Configuração do QueryClient com cache otimizado
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos - dados considerados "frescos"
      gcTime: 10 * 60 * 1000, // 10 minutos - tempo em cache (TanStack v5)
      refetchOnWindowFocus: false, // Não refetch ao focar janela
      retry: 1, // Tentar 1x em caso de erro
    },
  },
});

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LocalidadeProvider>
            <OperacionalProvider>
              <HashRouter>
                <AppRoutes />
              </HashRouter>
            </OperacionalProvider>
          </LocalidadeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;