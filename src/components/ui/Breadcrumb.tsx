import React from 'react';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  return (
    <nav className={`flex items-center gap-2 text-sm ${className}`}>
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <div className="flex items-center gap-2">
            <span 
              className={`font-medium tracking-tight ${
                item.active ? 'text-gray-900 ' : 'text-gray-400'
              }`}
            >
              {item.label}
            </span>
          </div>
          {idx < items.length - 1 && (
            <ChevronRight size={14} className="text-gray-300" />
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
