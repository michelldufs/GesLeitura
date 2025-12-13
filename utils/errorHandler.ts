/**
 * Tratamento centralizado de erros
 */

import { logger } from './logger';

interface FirebaseError {
  code: string;
  message: string;
}

/**
 * Mensagens amigáveis para erros do Firebase
 */
const firebaseErrorMessages: Record<string, string> = {
  'auth/user-not-found': 'Usuário não encontrado.',
  'auth/wrong-password': 'Senha incorreta.',
  'auth/email-already-in-use': 'Este email já está em uso.',
  'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
  'auth/invalid-email': 'Email inválido.',
  'auth/user-disabled': 'Esta conta foi desativada.',
  'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
  'auth/network-request-failed': 'Erro de conexão. Verifique sua internet.',
  'permission-denied': 'Você não tem permissão para esta ação.',
  'not-found': 'Registro não encontrado.',
  'already-exists': 'Este registro já existe.',
  'unavailable': 'Serviço temporariamente indisponível. Tente novamente.',
};

/**
 * Converte erro do Firebase em mensagem amigável
 */
function getFirebaseErrorMessage(code: string): string {
  return firebaseErrorMessages[code] || 'Ocorreu um erro. Tente novamente.';
}

/**
 * Handler principal de erros
 * @param error - Erro capturado
 * @param context - Contexto onde o erro ocorreu (ex: "Login", "Load Data")
 * @returns Mensagem amigável para mostrar ao usuário
 */
export const handleError = (error: unknown, context: string = 'Operação'): string => {
  logger.error(`[${context}]`, error);

  // Erro do Firebase
  if (error && typeof error === 'object' && 'code' in error) {
    const fbError = error as FirebaseError;
    return getFirebaseErrorMessage(fbError.code);
  }

  // Erro com mensagem customizada
  if (error instanceof Error) {
    return error.message;
  }

  // Erro genérico
  return 'Ocorreu um erro inesperado. Tente novamente.';
};

/**
 * Wrapper para funções assíncronas com tratamento de erro
 * @param fn - Função assíncrona
 * @param context - Contexto do erro
 * @param onError - Callback opcional para tratar erro
 */
export const withErrorHandling = async <T>(
  fn: () => Promise<T>,
  context: string,
  onError?: (message: string) => void
): Promise<T | null> => {
  try {
    return await fn();
  } catch (error) {
    const message = handleError(error, context);
    if (onError) {
      onError(message);
    }
    return null;
  }
};
