/**
 * Sistema de logging inteligente
 * Em desenvolvimento: loga tudo
 * Em produção: apenas erros
 */

const isDevelopment = import.meta.env.MODE === 'development';

export const logger = {
  /**
   * Log normal - apenas em desenvolvimento
   */
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Warning - apenas em desenvolvimento
   */
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * Erro - sempre loga (importante para debug em produção)
   */
  error: (...args: any[]) => {
    console.error(...args);
  },

  /**
   * Info - apenas em desenvolvimento
   */
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  /**
   * Debug - apenas em desenvolvimento
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};
