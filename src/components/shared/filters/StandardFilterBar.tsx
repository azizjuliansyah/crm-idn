'use client';

import React from 'react';
import { 
  Button, 
  H2, 
  Subtext, 
  SearchInput 
} from '@/components/ui';
import { Plus } from 'lucide-react';

export interface ViewModeOption {
  mode: string;
  icon: React.ReactNode;
  label?: string;
}

interface StandardFilterBarProps {
  title: string;
  subtitle?: string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  viewModes?: {
    current: string;
    onChange: (mode: string) => void;
    options: ViewModeOption[];
  };
  bulkActions?: React.ReactNode;
  leftElement?: React.ReactNode;
  extraActions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const StandardFilterBar: React.FC<StandardFilterBarProps> = ({
  title,
  subtitle,
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Cari data...',
  primaryAction,
  viewModes,
  bulkActions,
  leftElement,
  extraActions,
  children,
  className = ''
}) => {
  return (
    <div className={`flex flex-col gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0 ${className}`}>
      <div className="flex items-center justify-between gap-4 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
        <div className="flex items-center gap-4 flex-1 min-w-[200px]">
          {leftElement}
          <div className="flex-1 truncate">
            <H2 className="text-sm text-gray-900 leading-none truncate uppercase font-bold tracking-tight">{title}</H2>
            {subtitle && (
              <Subtext className="!text-[9px] text-emerald-600 uppercase mt-1 truncate font-medium">
                {subtitle}
              </Subtext>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {bulkActions}
          
          <div className="min-w-[200px] md:min-w-[240px]">
            <SearchInput
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={e => onSearchChange(e.target.value)}
              className="rounded-xl border-gray-100 active:ring-emerald-500 focus:ring-emerald-500 transition-all shadow-sm"
            />
          </div>

          {viewModes && viewModes.options.length > 0 && (
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-xl p-1 shrink-0">
              {viewModes.options.map((opt) => (
                <Button
                  key={opt.mode}
                  variant="ghost"
                  size="sm"
                  onClick={() => viewModes.onChange(opt.mode)}
                  className={`!p-2 rounded-lg transition-all ${
                    viewModes.current === opt.mode 
                      ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-zinc-200' 
                      : '!text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
                  }`}
                  title={opt.label || opt.mode}
                >
                  {opt.icon}
                </Button>
              ))}
            </div>
          )}

          {extraActions}

          {primaryAction && (
            <Button
              onClick={primaryAction.onClick}
              className="!px-6 py-2.5 text-[10px] uppercase shadow-lg shadow-emerald-100/50 hover:shadow-emerald-200/50 transition-all font-bold tracking-wider"
              variant="primary"
              size="sm"
              leftIcon={primaryAction.icon || <Plus size={14} />}
            >
              {primaryAction.label}
            </Button>
          )}
        </div>
      </div>
      
      {children && (
        <div className="flex items-center gap-3 pt-3 border-t border-gray-50 overflow-visible">
          {children}
        </div>
      )}
    </div>
  );
};
