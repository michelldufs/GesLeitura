/**
 * Componentes reutilizáveis com design Clean/Pill (Estilo Moderno)
 * Focado em inputs arredondados, botões pílula e estética clean.
 */
import React from 'react';

// Glass Card com efeito suave e mais arredondado
export const GlassCard: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`bg-white border border-gray-100 rounded-2xl shadow-sm ${className}`}>
    {children}
  </div>
);

// Button primário (Pílula Sólida - Refinado)
export const ButtonPrimary: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className = '', ...props }) => (
  <button
    className={`
      bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-gray-300 
      text-white text-sm font-medium py-2.5 px-5 rounded-xl shadow-sm hover:shadow-md 
      transition-all duration-200 disabled:opacity-70 disabled:shadow-none 
      flex items-center justify-center gap-2
      ${className}
    `}
    {...props}
  >
    {children}
  </button>
);

// Button secundário (Chips / Pílula Outline - Refinado)
export const ButtonSecondary: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ReactNode; active?: boolean }> = ({ children, className = '', icon, active = false, ...props }) => (
  <button
    className={`
      flex items-center justify-center font-medium text-sm py-2.5 px-5 rounded-xl transition-all duration-200 border
      ${active
        ? 'bg-emerald-50 text-emerald-700 border-transparent font-semibold'
        : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300'}
      disabled:opacity-50 disabled:cursor-not-allowed
      gap-2
      ${className}
    `}
    {...props}
  >
    {icon && <span className="inline-flex items-center">{icon}</span>}
    {children}
  </button>
);

// Input field (Estilo Barra de Pesquisa - Cinza e Redondo)
export const InputField: React.FC<{
  label?: string;
  placeholder?: string;
  value?: string | number;
  onChange?: (e: any) => void;
  type?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  error?: string;
  className?: string;
  required?: boolean;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  endIcon?: React.ReactNode;
  onEndIconClick?: () => void;
}> = ({ label, placeholder, value, onChange, type = 'text', disabled = false, icon, error, className = '', required, min, max, step, endIcon, onEndIconClick }) => (
  <div className={className}>
    {label && <label className="block text-sm font-medium text-gray-500 mb-2">{label}</label>}
    <div className="relative">
      {icon && (
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
          {icon}
        </div>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        min={min}
        max={max}
        step={step}
        className={`w-full ${icon ? 'pl-11' : 'pl-4'} ${endIcon ? 'pr-11' : 'pr-4'} py-3 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-xl text-gray-700 placeholder-gray-400 outline-none transition-all duration-200 disabled:opacity-60 disabled:bg-gray-100 ${error ? 'ring-2 ring-red-300 bg-red-50 focus:ring-red-500' : ''}`}
      />
      {endIcon && (
        <div
          className={`absolute inset-y-0 right-0 pr-4 flex items-center ${onEndIconClick ? 'cursor-pointer text-gray-500 hover:text-gray-700' : 'pointer-events-none text-gray-400'}`}
          onClick={onEndIconClick}
        >
          {endIcon}
        </div>
      )}
    </div>
    {error && <p className="text-red-500 text-xs mt-1 font-medium">{error}</p>}
  </div>
);

// Select field (Estilo Pílula)
export const SelectField: React.FC<{
  label?: string;
  options: { value: string; label: string }[];
  value?: string;
  onChange?: (e: any) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
  required?: boolean;
}> = ({ label, options, value, onChange, disabled = false, error, className = '', required }) => (
  <div className={className}>
    {label && <label className="block text-sm font-medium text-gray-500 mb-2">{label}</label>}
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-xl text-gray-700 outline-none transition-all appearance-none cursor-pointer disabled:opacity-60 ${error ? 'ring-2 ring-red-300 focus:ring-red-500' : ''}`}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-500">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </div>
    </div>
    {error && <p className="text-red-500 text-sm mt-1 ml-2 font-medium">{error}</p>}
  </div>
);

// Alert message box (Mais Clean)
export const AlertBox: React.FC<{
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ type, message, icon, children }) => {
  const styles = {
    success: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    error: 'bg-rose-50 text-rose-600 border-rose-100',
    warning: 'bg-orange-50 text-orange-600 border-orange-100',
    info: 'bg-blue-50 text-blue-600 border-blue-100',
  };

  return (
    <div className={`${styles[type]} px-4 py-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-3 text-sm border`}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <p className="font-medium flex-1">{message}</p>
      {children}
    </div>
  );
};

// Modal (Mais limpo)
export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}> = ({ isOpen, onClose, title, children, actions, size = 'lg' }) => {
  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl'
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-white w-full ${widthClasses[size]} p-6 sm:p-8 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto transform transition-all animate-in fade-in zoom-in-95 duration-200`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
            <span className="text-2xl leading-none">&times;</span>
          </button>
        </div>
        <div className="mb-8">{children}</div>
        {actions && <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-slate-100">{actions}</div>}
      </div>
    </div>
  );
};

// Header (Mais limpo)
export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}> = ({ title, subtitle, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 mb-8">
    <div>
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
      {subtitle && <p className="text-slate-500 text-sm mt-1 font-medium">{subtitle}</p>}
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

// Table (Clean Rows)
export const Table: React.FC<{
  columns: { key: string; label: string }[];
  data: Record<string, any>[];
  actions?: (row: any) => React.ReactNode;
}> = ({ columns, data, actions }) => (
  <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-[#f0f2f5] border-b border-slate-200">
          <tr>
            {columns.map(col => (
              <th key={col.key} className="px-6 py-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                {col.label}
              </th>
            ))}
            {actions && <th className="px-6 py-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Ações</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {data.map((row, idx) => (
            <tr key={idx} className="hover:bg-slate-50 transition-colors">
              {columns.map(col => (
                <td key={col.key} className="px-6 py-4 text-slate-700 whitespace-nowrap">
                  {row[col.key]}
                </td>
              ))}
              {actions && <td className="px-6 py-4 whitespace-nowrap">{actions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// Separator
export const Divider = () => <div className="h-px bg-slate-100 my-8" />;

// Badge (Pill Style - COMPACTO)
export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'active' | 'inactive' | 'error' | 'warning' | 'secondary';
  className?: string; // Permitir personalização adicional
}> = ({ children, variant = 'secondary', className = '' }) => {
  const colors = {
    primary: 'bg-emerald-50 text-emerald-600',
    success: 'bg-emerald-50 text-emerald-600',
    active: 'bg-emerald-50 text-emerald-600',
    inactive: 'bg-rose-50 text-rose-600',
    error: 'bg-rose-50 text-rose-600',
    warning: 'bg-orange-50 text-orange-600',
    secondary: 'bg-gray-100 text-gray-600',
  };

  return (
    <span className={`${colors[variant]} inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${className}`}>
      {children}
    </span>
  );
};
