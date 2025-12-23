/**
 * Utilitário para medir performance de operações
 */

import { logger } from './logger';
import { formatCurrency } from './formatters';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

const metrics: PerformanceMetric[] = [];

/**
 * Inicia medição de performance
 * @param name Nome da operação a ser medida
 * @returns Objeto com método end() para finalizar medição
 * 
 * @example
 * const perf = measurePerformance('Load Data');
 * await loadData();
 * perf.end();
 */
export const measurePerformance = (name: string) => {
  const startTime = performance.now();

  const metric: PerformanceMetric = {
    name,
    startTime
  };

  metrics.push(metric);

  return {
    end: () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      metric.endTime = endTime;
      metric.duration = duration;

      logger.info(`⏱️ ${name}: ${formatCurrency(duration)}ms`);

      // Avisar se performance estiver ruim
      if (duration > 3000) {
        logger.warn(`⚠️ ${name} levou mais de 3 segundos!`);
      }

      return duration;
    }
  };
};

/**
 * Retorna todas as métricas coletadas
 */
export const getMetrics = (): PerformanceMetric[] => {
  return [...metrics];
};

/**
 * Limpa histórico de métricas
 */
export const clearMetrics = () => {
  metrics.length = 0;
};

/**
 * Wrapper para funções assíncronas com medição automática
 * @param name Nome da operação
 * @param fn Função assíncrona a ser executada
 */
export const withPerformance = async <T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> => {
  const perf = measurePerformance(name);
  try {
    return await fn();
  } finally {
    perf.end();
  }
};
