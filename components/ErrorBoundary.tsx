import React, { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { logger } from '../utils/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary - Captura erros não tratados em componentes React
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Error Boundary capturou erro:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-red-100 rounded-full">
                <AlertTriangle size={48} className="text-red-600" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-slate-900 mb-3">
              Algo deu errado
            </h1>
            
            <p className="text-slate-600 mb-6">
              Ocorreu um erro inesperado. Nossa equipe foi notificada e está trabalhando para resolver o problema.
            </p>
            
            {this.state.error && import.meta.env.MODE === 'development' && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg text-left">
                <p className="text-xs font-mono text-red-800 break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
            
            <button
              onClick={this.handleReset}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              Voltar para o Início
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
