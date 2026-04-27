import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  className = '',
  containerClassName = '',
  children,
  ...props
}) => {
  return (
    <div className={`space-y-2 ${containerClassName}`}>
      {label && (
        <label className="text-[10px] font-medium text-gray-400 uppercase  ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={`w-full px-5 py-3.5 bg-white border border-gray-200 rounded-md font-medium text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50/50 transition-all hover:border-gray-300 appearance-none ${error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-50/50' : ''} ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      {error && <p className="text-[9px] text-rose-500  uppercase ml-1">{error}</p>}
    </div>
  );
};
