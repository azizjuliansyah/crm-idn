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
  TableContainer
} from '@/components/ui';
import { 
  MoveUp, 
  MoveDown, 
  ArrowUpDown,
  Loader2
} from 'lucide-react';
import { Pagination } from './Pagination';

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
  
  // Pagination Props
  page?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  
  isLoading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  rowClassName?: (item: T) => string;
  onRowClick?: (item: T) => void;
  sortIconColor?: string;
}

export function BaseDataTable<T extends { id: number | string }>({
  data,
  columns,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  sortConfig,
  onSort,
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  emptyMessage = 'Data tidak ditemukan',
  emptyIcon,
  rowClassName,
  onRowClick,
  sortIconColor
}: BaseDataTableProps<T>) {
  const allSelected = useMemo(() => {
    return data.length > 0 && selectedIds.length === data.length;
  }, [data, selectedIds]);

  const SortIcon = ({ colKey }: { colKey: string }) => {
    const isSorted = onSort && sortConfig?.key === colKey;
    const colorClass = isSorted ? (sortIconColor || 'text-black') : 'opacity-20 group-hover:opacity-100 transition-opacity';
    
    if (!isSorted) {
      return <ArrowUpDown size={12} className={`ml-1 ${colorClass}`} />;
    }

    return sortConfig.direction === 'asc' ? 
      <MoveUp size={10} className={`ml-1 ${colorClass} transition-transform duration-200`} /> : 
      <MoveDown size={10} className={`ml-1 ${colorClass} transition-transform duration-200`} />;
  };

  const colSpan = columns.length + (onToggleSelect ? 1 : 0);

  return (
    <TableContainer
      height="h-full"
      footer={!isLoading && data.length > 0 && page !== undefined && pageSize !== undefined && totalCount !== undefined && (
        <Pagination
          currentPage={page}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={onPageChange || (() => {})}
          onPageSizeChange={onPageSizeChange || (() => {})}
        />
      )}
    >
      <Table className="w-full text-left border-collapse min-w-[800px]">
        <TableHeader className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <TableRow className="!bg-transparent border-none text-emerald-600 py-6">
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
          {isLoading && data.length === 0 ? (
            <TableRow className="!bg-transparent border-none">
              <TableCell colSpan={colSpan} className="py-32 text-center">
                <div className="flex flex-col items-center justify-center gap-4">
                  <Loader2 className="animate-spin text-emerald-500" size={32} />
                  <Subtext className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">Memuat Data...</Subtext>
                </div>
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow className="!bg-transparent hover:!bg-transparent border-none">
              <TableCell colSpan={colSpan} className="py-32 text-center relative">
                  {emptyIcon && <div className="mb-4 flex justify-center opacity-20 transform scale-125 transition-all group-hover:scale-135">{emptyIcon}</div>}
                  <Subtext className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">{emptyMessage}</Subtext>
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <TableRow 
                  key={item.id} 
                  className={`hover:bg-gray-50/40 group transition-all duration-200 ${isSelected ? 'bg-emerald-50/30' : ''} ${onRowClick ? 'cursor-pointer' : ''} ${rowClassName?.(item) || ''}`}
                  onClick={() => onRowClick?.(item)}
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
            })
          )}
        </TableBody>
      </Table>
      
      {isLoading && data.length > 0 && (
         <div className="flex items-center justify-center py-4 bg-gray-50/30 border-t border-gray-100 italic gap-2">
            <Loader2 className="animate-spin text-emerald-500" size={14} />
            <Subtext className="text-[10px] uppercase text-gray-400 font-bold">Memperbarui...</Subtext>
         </div>
      )}
    </TableContainer>
  );
}

