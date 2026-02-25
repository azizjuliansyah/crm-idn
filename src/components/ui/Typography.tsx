import React from 'react';

interface TextProps {
  children?: React.ReactNode;
  className?: string;
  title?: string;
}

export const H1: React.FC<TextProps> = ({ children, className = '', title }) => (
  <h1 title={title} className={`text-4xl font-medium tracking-tight text-gray-900 ${className}`}>
    {children}
  </h1>
);

export const H2: React.FC<TextProps> = ({ children, className = '', title }) => (
  <h2 title={title} className={`text-2xl font-medium tracking-tight text-gray-900 ${className}`}>
    {children}
  </h2>
);

export const H3: React.FC<TextProps> = ({ children, className = '', title }) => (
  <h3 title={title} className={`text-lg font-medium text-gray-900 uppercase tracking-tight ${className}`}>
    {children}
  </h3>
);

export const H4: React.FC<TextProps> = ({ children, className = '', title }) => (
  <h4 title={title} className={`text-[11px] font-medium uppercase tracking-tight text-gray-900 ${className}`}>
    {children}
  </h4>
);

export const Subtext: React.FC<TextProps> = ({ children, className = '', title }) => (
  <p title={title} className={`text-sm text-gray-500 ${className}`}>
    {children}
  </p>
);

export const Label: React.FC<TextProps> = ({ children, className = '', title }) => (
  <span title={title} className={`text-[10px] font-medium text-gray-400 uppercase tracking-tight ${className}`}>
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
        <h3 className="text-base font-medium text-gray-800 tracking-tight">{title}</h3>
        {subtext && <p className="text-[11px] font-medium text-gray-400 mt-0.5">{subtext}</p>}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
