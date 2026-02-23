import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  action,
  className = '',
  contentClassName = '',
}) => {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
          <div>
            {typeof title === 'string' ? (
              <h3 className="text-lg font-bold uppercase tracking-tight">{title}</h3>
            ) : (
              title
            )}
            {subtitle && (
              <p className="text-sm text-gray-400 font-medium mt-1">{subtitle}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={`${contentClassName}`}>
        {children}
      </div>
    </div>
  );
};
