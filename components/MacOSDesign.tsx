/**
 * Componentes reutilizáveis com design macOS Tahoe
 * Garantem consistência visual em todo o sistema
 */
import React from 'react';

// Glass Card com efeito Tahoe
export const GlassCard: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`backdrop-blur-xl bg-white/80 border border-white/30 rounded-2xl shadow-2xl ${className}`}>
    {children}
  </div>
);

// Button primário macOS style
export const ButtonPrimary: React.FC<{
  children: React.ReactNode;
  onClick?: (e?: any) => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}> = ({ children, onClick, disabled = false, className = '', type = 'button' }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 disabled:opacity-60 ${className}`}
  >
    {children}
  </button>
);

// Button secundário (outline) macOS style
export const ButtonSecondary: React.FC<{
  children: React.ReactNode;
  onClick?: (e?: any) => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  icon?: React.ReactNode;
}> = ({ children, onClick, disabled = false, className = '', type = 'button', icon }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`bg-transparent border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-3 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 ${className}`}
  >
    {icon && <span className="mr-2 inline-flex items-center">{icon}</span>}
    {children}
  </button>
);

// Input field macOS style
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
    {label && <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>}
    <div className="relative">
      {icon && (
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
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
        className={`w-full ${icon ? 'pl-12' : 'pl-4'} pr-4 py-3 bg-slate-50/50 border border-slate-200/50 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all disabled:opacity-50 uppercase ${error ? 'border-red-300 focus:ring-red-400' : ''}`}
      />
    </div>
    {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
  </div>
);

// Select field macOS style
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
    {label && <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>}
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      className={`w-full px-4 py-3 bg-slate-50/50 border border-slate-200/50 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all disabled:opacity-50 ${error ? 'border-red-300 focus:ring-red-400' : ''}`}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
  </div>
);

// Alert message box macOS style
export const AlertBox: React.FC<{
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ type, message, icon, children }) => {
  const bgColors = {
    success: 'bg-green-50/80 border-green-200/50 text-green-600',
    error: 'bg-red-50/80 border-red-200/50 text-red-600',
    warning: 'bg-yellow-50/80 border-yellow-200/50 text-yellow-600',
    info: 'bg-blue-50/80 border-blue-200/50 text-blue-600',
  };

  return (
    <div className={`${bgColors[type]} border p-3 sm:p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 text-xs sm:text-sm`}>
      {icon && <span className="flex-shrink-0 mt-0.5 sm:mt-0">{icon}</span>}
      <p className="font-medium flex-1">{message}</p>
      {children}
    </div>
  );
};

// Modal macOS style - Responsivo
export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ isOpen, onClose, title, children, actions }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-sm md:max-w-lg lg:max-w-2xl p-4 sm:p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-4 sm:mb-6">{title}</h2>
        <div className="mb-4 sm:mb-8 max-h-96 overflow-y-auto">{children}</div>
        {actions && <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-end">{actions}</div>}
      </GlassCard>
    </div>
  );
};

// Header com título e ação - Responsivo
export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}> = ({ title, subtitle, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 mb-6 sm:mb-8">
    <div>
      <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">{title}</h1>
      {subtitle && <p className="text-slate-500 text-xs sm:text-sm mt-1">{subtitle}</p>}
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

// Table macOS style - Responsivo com scroll mobile
export const Table: React.FC<{
  columns: { key: string; label: string }[];
  data: Record<string, any>[];
  actions?: (row: any) => React.ReactNode;
}> = ({ columns, data, actions }) => (
  <div className="overflow-x-auto rounded-xl border border-slate-200/50">
    <table className="w-full text-xs sm:text-sm text-left">
      <thead className="bg-slate-50/50 border-b border-slate-200/50">
        <tr>
          {columns.map(col => (
            <th key={col.key} className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 font-semibold text-slate-700 text-xs uppercase tracking-tight sm:tracking-wide">
              {col.label}
            </th>
          ))}
          {actions && <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 font-semibold text-slate-700 text-xs uppercase tracking-tight sm:tracking-wide">Ações</th>}
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
            {columns.map(col => (
              <td key={col.key} className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-slate-900 truncate">
                {row[col.key]}
              </td>
            ))}
            {actions && <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">{actions(row)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Separator/Divider
export const Divider = () => <div className="h-px bg-slate-200/50 my-6" />;

// Badge macOS style
export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'error' | 'warning' | 'secondary';
  type?: string; // compat
}> = ({ children, variant = 'secondary' }) => {
  const colors = {
    primary: 'bg-blue-100/80 text-blue-700',
    success: 'bg-green-100/80 text-green-700',
    error: 'bg-red-100/80 text-red-700',
    warning: 'bg-yellow-100/80 text-yellow-700',
    secondary: 'bg-slate-100/80 text-slate-700',
  };

  return (
    <span className={`${colors[variant]} inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold`}>
      {children}
    </span>
  );
};
