/**
 * Format a number to Brazilian currency string (e.g., "1.234,56") without the symbol.
 * Use this when the layouts already explicitly include "R$".
 */
export const formatCurrency = (value: number | string | undefined | null): string => {
    if (value === undefined || value === null || value === '') return '0,00';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0,00';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
