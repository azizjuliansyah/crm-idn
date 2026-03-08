import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'indigo';
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'center' | 'right';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'ghost',
  size = 'md',
  align = 'center',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center uppercase font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

  const variants = {
    primary: 'bg-blue-600 text-white shadow-lg shadow-blue-100 hover:bg-blue-700',
    secondary: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
    danger: 'bg-rose-600 text-white shadow-lg shadow-rose-100 hover:bg-rose-700',
    success: 'bg-emerald-600 text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700',
    indigo: 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700',
    ghost: 'bg-transparent text-gray-500 hover:bg-gray-50',
  };

  const sizes = {
    sm: 'px-4 py-2 text-[10px] rounded-lg gap-1.5',
    md: 'px-6 py-3.5 text-[12px] rounded-xl gap-2',
    lg: 'px-8 py-4 text-[14px] rounded-2xl gap-3',
  };

  const alignments = {
    left: 'justify-start text-left',
    center: 'justify-center text-center',
    right: 'justify-end text-right',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${alignments[align]} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="animate-spin" size={size === 'sm' ? 12 : 14} />
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
