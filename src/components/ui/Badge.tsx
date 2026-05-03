import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'ghost' | 'emerald' | 'rose' | 'amber' | 'sky' | 'indigo' | 'violet';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
}) => {
  const baseStyles = 'px-3 py-1 text-[10px] font-medium uppercase rounded-full border-2 shadow-none inline-flex items-center';

  const variants = {
    primary: 'bg-blue-50 text-blue-600 border-blue-100',
    secondary: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    success: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    danger: 'bg-rose-50 text-rose-600 border-rose-100',
    warning: 'bg-amber-50 text-amber-600 border-amber-100',
    info: 'bg-sky-50 text-sky-600 border-sky-100',
    neutral: 'bg-gray-50 text-gray-400 border-gray-200',
    ghost: 'bg-transparent text-gray-500 border-gray-200 shadow-none',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    sky: 'bg-sky-50 text-sky-600 border-sky-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    violet: 'bg-violet-50 text-violet-600 border-violet-100',
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
