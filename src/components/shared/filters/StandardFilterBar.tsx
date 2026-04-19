'use client';

import React from 'react';
import {
  Button,
  H2,
  Subtext,
  SearchInput
} from '@/components/ui';
import { Plus, FileSpreadsheet } from 'lucide-react';

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
  onExport?: () => void;
  exportFilename?: string;
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
  onExport,
  exportFilename,
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
        <div className="flex items-center gap-4 flex-1 min-w-[120px]">
          {leftElement}
          <div className="shrink-0 max-w-[200px] truncate">
            <H2 className="text-sm text-gray-900 leading-none truncate uppercase font-bold tracking-tight">{title}</H2>
            {subtitle && (
              <Subtext className="!text-[9px] text-emerald-600 uppercase mt-1 truncate font-medium">
                {subtitle}
              </Subtext>
            )}
          </div>

          {bulkActions && (
            <div className="flex items-center pl-2 ml-2 border-l border-gray-100">
              {bulkActions}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {viewModes && viewModes.options.length > 0 && (
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-lg p-1 shrink-0">
              {viewModes.options.map((opt) => (
                <Button
                  key={opt.mode}
                  variant="ghost"
                  size="sm"
                  onClick={() => viewModes.onChange(opt.mode)}
                  className={`!p-1.5 rounded-md transition-all ${viewModes.current === opt.mode
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

          {onExport && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onExport}
              className="!px-4 py-2.5 text-[10px] uppercase font-bold tracking-wider border border-gray-200 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50 transition-all text-gray-600 flex items-center gap-2 group"
              title="Export to Excel"
            >
              <FileSpreadsheet size={14} className="text-gray-400 group-hover:text-blue-500" />
              <span>Export</span>
            </Button>
          )}

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

      {(children || searchTerm !== undefined) && (
        <div className="flex items-center gap-3 pt-3 border-t border-gray-50 overflow-x-auto custom-scrollbar pb-2 md:pb-1">
          {onSearchChange && searchTerm !== undefined && (
            <div className="w-[300px] md:w-[300px] shrink-0">
              <SearchInput
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={e => onSearchChange(e.target.value)}
                className="!rounded-md !border-gray-200 transition-all !shadow-none !text-[10px] !font-bold !uppercase placeholder:uppercase placeholder:text-[10px] placeholder:font-bold placeholder:text-gray-400 !py-3.5"
              />
            </div>
          )}
          <div className="flex items-center gap-3 shrink-0">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};
