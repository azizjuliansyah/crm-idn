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
    <div className="space-y-2">
      {label && (
        <label className="text-[10px] font-medium text-gray-400 uppercase tracking-tight ml-1">
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
          className={`w-full ${leftIcon ? 'pl-11' : 'px-5'} py-3.5 bg-white border border-gray-200 rounded-md font-medium text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all hover:border-gray-300 ${error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-50/50' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-[9px] text-rose-500  uppercase ml-1">{error}</p>}
    </div>
  );
};


