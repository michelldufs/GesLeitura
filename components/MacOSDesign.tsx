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
  <div className={`bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/50 ${className}`}>
    {children}
  </div>
);

// Button primário (Pílula Sólida)
export const ButtonPrimary: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className = '', ...props }) => (
  <button
    className={`bg-[#008069] hover:bg-[#006d59] active:bg-[#005c4b] disabled:bg-slate-300 text-white font-bold py-3 px-8 rounded-full shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-70 disabled:shadow-none ${className}`}
    {...props}
  >
    {children}
  </button>
);

// Button secundário (Chips / Pílula Outline)
export const ButtonSecondary: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ReactNode; active?: boolean }> = ({ children, className = '', icon, active = false, ...props }) => (
  <button
    className={`
      flex items-center justify-center font-medium py-2 px-5 rounded-full transition-all duration-200 border
      ${active
        ? 'bg-[#e7fce3] text-[#008069] border-transparent font-bold'
        : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'}
      disabled:opacity-50 disabled:cursor-not-allowed
      ${className}
    `}
    {...props}
  >
    {icon && <span className="mr-2 inline-flex items-center">{icon}</span>}
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
}> = ({ label, placeholder, value, onChange, type = 'text', disabled = false, icon, error, className = '', required, min, max, step }) => (
  <div className={className}>
    {label && <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">{label}</label>}
    <div className="relative">
      {icon && (
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-500">
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
        className={`w-full ${icon ? 'pl-12' : 'pl-6'} pr-6 py-3.5 bg-[#f0f2f5] border-transparent border-2 focus:bg-white focus:border-[#008069] rounded-full text-slate-900 placeholder-slate-500 outline-none transition-all duration-200 disabled:opacity-60 disabled:bg-slate-100 ${error ? 'border-red-300 bg-red-50 focus:border-red-500' : ''}`}
      />
    </div>
    {error && <p className="text-red-500 text-sm mt-1 ml-2 font-medium">{error}</p>}
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
    {label && <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">{label}</label>}
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`w-full px-6 py-3.5 bg-[#f0f2f5] border-transparent border-2 focus:bg-white focus:border-[#008069] rounded-full text-slate-900 outline-none transition-all appearance-none cursor-pointer disabled:opacity-60 ${error ? 'border-red-300 focus:border-red-500' : ''}`}
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
    success: 'bg-[#e7fce3] text-[#008069]',
    error: 'bg-red-50 text-red-600',
    warning: 'bg-amber-50 text-amber-600',
    info: 'bg-blue-50 text-blue-600',
  };

  return (
    <div className={`${styles[type]} px-4 py-3 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-3 text-sm border border-transparent`}>
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
      <div className={`bg-white w-full ${widthClasses[size]} p-6 sm:p-8 rounded-[2rem] shadow-2xl max-h-[90vh] overflow-y-auto transform transition-all animate-in fade-in zoom-in-95 duration-200`}>
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
    primary: 'bg-blue-50 text-blue-700 border border-blue-100',
    success: 'bg-[#e7fce3] text-[#008069] border border-[#dcf8c6]',
    active: 'bg-teal-50 text-teal-700 border border-teal-100', // Novo Ativo
    inactive: 'bg-rose-50 text-rose-700 border border-rose-100', // Novo Inativo
    error: 'bg-red-50 text-red-700 border border-red-100',
    warning: 'bg-amber-50 text-amber-700 border border-amber-100',
    secondary: 'bg-slate-100 text-slate-600 border border-slate-200',
  };

  return (
    <span className={`${colors[variant]} inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide leading-tight ${className}`}>
      {children}
    </span>
  );
};
