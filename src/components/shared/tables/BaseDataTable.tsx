'use client';

import React, { useMemo } from 'react';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableCell, 
  Checkbox, 
  Subtext,
  InfiniteScrollSentinel
} from '@/components/ui';
import { 
  ChevronUp, 
  ChevronDown, 
  ArrowUpDown 
} from 'lucide-react';

export interface ColumnConfig<T> {
  header: string;
  key: string;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  render?: (item: T) => React.ReactNode;
}

interface BaseDataTableProps<T extends { id: number | string }> {
  data: T[];
  columns: ColumnConfig<T>[];
  selectedIds?: (number | string)[];
  onToggleSelect?: (id: number | string) => void;
  onToggleSelectAll?: () => void;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  onSort?: (key: string) => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  rowClassName?: (item: T) => string;
}

export function BaseDataTable<T extends { id: number | string }>({
  data,
  columns,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  sortConfig,
  onSort,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  emptyMessage = 'Data tidak ditemukan',
  emptyIcon,
  rowClassName
}: BaseDataTableProps<T>) {
  const allSelected = useMemo(() => {
    return data.length > 0 && selectedIds.length === data.length;
  }, [data, selectedIds]);

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (!onSort || sortConfig?.key !== colKey) {
      return <ArrowUpDown size={12} className="ml-1 opacity-20 group-hover:opacity-100 transition-opacity" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ChevronUp size={12} className="ml-1 text-emerald-600 transition-transform duration-200" /> : 
      <ChevronDown size={12} className="ml-1 text-emerald-600 transition-transform duration-200" />;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden h-full">
      <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar scroll-smooth">
        <Table className="w-full text-left border-collapse min-w-[800px]">
          <TableHeader className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100">
            <TableRow className="!bg-transparent border-none">
              {onToggleSelectAll && (
                <TableCell isHeader className="px-6 py-5 w-12 text-center">
                  <Checkbox
                    checked={allSelected}
                    onChange={onToggleSelectAll}
                    variant="emerald"
                  />
                </TableCell>
              )}
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  isHeader
                  onClick={() => col.sortable && onSort?.(col.key)}
                  className={`px-6 py-5 ${col.sortable ? 'cursor-pointer group select-none active:scale-95 transition-transform' : ''} ${col.headerClassName || ''}`}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && <SortIcon colKey={col.key} />}
                  </div>
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-50/50">
            {data.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <TableRow 
                  key={item.id} 
                  className={`hover:bg-gray-50/40 group transition-all duration-200 ${isSelected ? 'bg-emerald-50/30' : ''} ${rowClassName?.(item) || ''}`}
                >
                  {onToggleSelect && (
                    <TableCell className="px-6 py-4 text-center">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => onToggleSelect(item.id)}
                        variant="emerald"
                      />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={`${item.id}-${col.key}`} className={`px-6 py-4 transition-colors ${col.className || ''}`}>
                      {col.render ? col.render(item) : (item as any)[col.key]}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}

            <InfiniteScrollSentinel 
              onIntersect={() => onLoadMore?.()}
              enabled={hasMore}
              colSpan={columns.length + (onToggleSelect ? 1 : 0)}
              isLoading={isLoadingMore}
            />

            {data.length === 0 && !isLoadingMore && (
              <TableRow className="!bg-transparent hover:!bg-transparent border-none">
                <TableCell colSpan={columns.length + (onToggleSelect ? 1 : 0)} className="py-32 text-center">
                  {emptyIcon && <div className="mb-4 flex justify-center opacity-20 transform scale-125 transition-all group-hover:scale-135">{emptyIcon}</div>}
                  <Subtext className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">{emptyMessage}</Subtext>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
