import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-2 w-full">
      {label && (
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">
            {leftIcon}
          </div>
        )}
        <input
          className={`w-full ${leftIcon ? 'pl-11' : 'px-5'} py-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner ${error ? 'border-rose-300 focus:border-rose-500' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-[9px] text-rose-500 font-bold uppercase ml-1">{error}</p>}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  children,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-2 w-full">
      {label && (
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
          {label}
        </label>
      )}
      <select
        className={`w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm outline-none focus:bg-white focus:border-blue-500 transition-all cursor-pointer ${error ? 'border-rose-300 focus:border-rose-500' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-[9px] text-rose-500 font-bold uppercase ml-1">{error}</p>}
    </div>
  );
};
