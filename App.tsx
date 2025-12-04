import React from 'react';
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LocalidadeProvider } from './contexts/LocalidadeContext';
import AppRoutes from './routes/AppRoutes';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <LocalidadeProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </LocalidadeProvider>
    </AuthProvider>
  );
};

export default App;