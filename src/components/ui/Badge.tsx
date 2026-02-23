import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'ghost';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
}) => {
  const baseStyles = 'px-3 py-1 text-[9px] font-bold uppercase rounded-full border shadow-sm inline-flex items-center';
  
  const variants = {
    primary: 'bg-blue-50 text-blue-600 border-blue-100',
    secondary: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    success: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    danger: 'bg-rose-50 text-rose-600 border-rose-100',
    warning: 'bg-amber-50 text-amber-600 border-amber-100',
    info: 'bg-sky-50 text-sky-600 border-sky-100',
    neutral: 'bg-gray-50 text-gray-400 border-gray-200',
    ghost: 'bg-transparent text-gray-500 border-gray-200 shadow-none',
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
