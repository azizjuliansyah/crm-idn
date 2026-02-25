import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-20 text-center ${className}`}>
      {icon && <div className="mb-4 opacity-20 flex justify-center text-gray-400">{icon}</div>}
      <h3 className="text-gray-300  uppercase text-[10px] tracking-tight italic opacity-40">
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-xs text-gray-300 font-medium italic opacity-30">
          {description}
        </p>
      )}
    </div>
  );
};
