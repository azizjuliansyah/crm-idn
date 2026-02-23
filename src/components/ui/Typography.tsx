import React from 'react';

interface TextProps {
  children: React.ReactNode;
  className?: string;
}

export const H1: React.FC<TextProps> = ({ children, className = '' }) => (
  <h1 className={`text-4xl font-bold tracking-tighter text-gray-900 ${className}`}>
    {children}
  </h1>
);

export const H2: React.FC<TextProps> = ({ children, className = '' }) => (
  <h2 className={`text-2xl font-bold tracking-tighter text-gray-900 ${className}`}>
    {children}
  </h2>
);

export const H3: React.FC<TextProps> = ({ children, className = '' }) => (
  <h3 className={`text-lg font-bold uppercase tracking-tight text-gray-900 ${className}`}>
    {children}
  </h3>
);

export const Subtext: React.FC<TextProps> = ({ children, className = '' }) => (
  <p className={`text-sm text-gray-400 font-medium ${className}`}>
    {children}
  </p>
);

export const Label: React.FC<TextProps> = ({ children, className = '' }) => (
  <span className={`text-[10px] font-bold text-gray-400 uppercase tracking-widest ${className}`}>
    {children}
  </span>
);

interface SectionHeaderProps {
  icon?: React.ReactNode;
  title: string;
  subtext?: string;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title, subtext, action, className = '' }) => (
  <div className={`flex items-center justify-between gap-3 ${className}`}>
    <div className="flex items-center gap-3">
      {icon && (
        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          {icon}
        </div>
      )}
      <div>
        <h3 className="text-base font-bold text-gray-800 tracking-tight">{title}</h3>
        {subtext && <p className="text-[11px] font-medium text-gray-400 mt-0.5">{subtext}</p>}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
