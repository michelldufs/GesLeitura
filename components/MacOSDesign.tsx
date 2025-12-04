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
  onClick?: () => void;
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
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}> = ({ children, onClick, disabled = false, className = '' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`bg-transparent border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-3 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 ${className}`}
  >
    {children}
  </button>
);

// Input field macOS style
export const InputField: React.FC<{
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  error?: string;
  className?: string;
}> = ({ label, placeholder, value, onChange, type = 'text', disabled = false, icon, error, className = '' }) => (
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
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
}> = ({ label, options, value, onChange, disabled = false, error, className = '' }) => (
  <div className={className}>
    {label && <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>}
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
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
}> = ({ type, message, icon }) => {
  const bgColors = {
    success: 'bg-green-50/80 border-green-200/50 text-green-600',
    error: 'bg-red-50/80 border-red-200/50 text-red-600',
    warning: 'bg-yellow-50/80 border-yellow-200/50 text-yellow-600',
    info: 'bg-blue-50/80 border-blue-200/50 text-blue-600',
  };

  return (
    <div className={`${bgColors[type]} border p-4 rounded-lg flex items-center gap-3`}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
};

// Modal macOS style
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
      <GlassCard className="w-full max-w-lg p-8">
        <h2 className="text-2xl font-semibold text-slate-900 mb-6">{title}</h2>
        <div className="mb-8 max-h-96 overflow-y-auto">{children}</div>
        {actions && <div className="flex gap-4 justify-end">{actions}</div>}
      </GlassCard>
    </div>
  );
};

// Header com título e ação
export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}> = ({ title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-8">
    <div>
      <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
      {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

// Table macOS style
export const Table: React.FC<{
  columns: { key: string; label: string }[];
  data: Record<string, any>[];
  actions?: (row: any) => React.ReactNode;
}> = ({ columns, data, actions }) => (
  <div className="overflow-x-auto rounded-xl border border-slate-200/50">
    <table className="w-full text-sm text-left">
      <thead className="bg-slate-50/50 border-b border-slate-200/50">
        <tr>
          {columns.map(col => (
            <th key={col.key} className="px-6 py-4 font-semibold text-slate-700 text-xs uppercase tracking-wide">
              {col.label}
            </th>
          ))}
          {actions && <th className="px-6 py-4 font-semibold text-slate-700 text-xs uppercase tracking-wide">Ações</th>}
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
            {columns.map(col => (
              <td key={col.key} className="px-6 py-4 text-slate-900">
                {row[col.key]}
              </td>
            ))}
            {actions && <td className="px-6 py-4">{actions(row)}</td>}
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
