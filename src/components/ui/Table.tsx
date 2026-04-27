'use client';
import React, { useEffect, useRef } from 'react';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<TableProps> = ({ children, className = '' }) => (
  <div className={`overflow-x-auto w-full custom-scrollbar outline-none ${className}`}>
    <table className="w-full text-left border-collapse">
      {children}
    </table>
  </div>
);

export const TableHeader: React.FC<TableProps> = ({ children, className = '' }) => (
  <thead className={`bg-gray-50/50 sticky top-0 z-10 backdrop-blur-sm ${className}`}>
    {children}
  </thead>
);

export const TableBody = React.forwardRef<HTMLTableSectionElement, TableProps>(
  ({ children, className = '' }, ref) => (
    <tbody ref={ref} className={`divide-y divide-gray-50 ${className}`}>
      {children}
    </tbody>
  )
);
TableBody.displayName = 'TableBody';

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ children, className = '', ...props }) => (
  <tr className={`hover:bg-gray-100/40 even:bg-gray-50 group transition-colors ${className}`} {...props}>
    {children}
  </tr>
);

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode;
  isHeader?: boolean;
}

export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ children, isHeader = false, className = '', ...props }, ref) => {
    if (isHeader) {
      return (
        <th
          ref={ref as any}
          className={`px-4 py-3 text-[12px] font-bold text-gray-600 uppercase  border-b border-gray-100 ${className}`}
          {...props}
        >
          {children}
        </th>
      );
    }
    return (
      <td
        ref={ref}
        className={`px-4 py-3 font-bold text-[12px] ${className}`}
        {...props}
      >
        {children}
      </td>
    );
  }
);
TableCell.displayName = 'TableCell';

export const TableEmpty: React.FC<{ colSpan: number; message?: string; icon?: React.ReactNode }> = ({ colSpan, message = 'Data tidak ditemukan', icon }) => (
  <tr>
    <td colSpan={colSpan} className="py-20 text-center">
      {icon && <div className="mb-4 opacity-10 flex justify-center">{icon}</div>}
      <p className="text-gray-300 font-medium uppercase text-[10px]  italic opacity-30">
        {message}
      </p>
    </td>
  </tr>
);

export const TableLoading: React.FC<{ colSpan: number }> = ({ colSpan }) => (
  <tr>
    <td colSpan={colSpan} className="py-8 text-center">
      <div className="flex justify-center flex-col items-center gap-2">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Memuat...</span>
      </div>
    </td>
  </tr>
);

export const InfiniteScrollSentinel: React.FC<{
  onIntersect: () => void;
  enabled: boolean;
  colSpan?: number;
  isLoading?: boolean;
}> = ({ onIntersect, enabled, colSpan, isLoading }) => {
  const sentinelRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          onIntersect();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [enabled, onIntersect, isLoading]);

  if (!enabled) return null;

  if (colSpan !== undefined) {
    return (
      <tr ref={sentinelRef}>
        <td colSpan={colSpan} className="py-8">
          {isLoading && (
            <div className="flex justify-center flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Memuat Lebih Banyak...</span>
            </div>
          )}
        </td>
      </tr>
    );
  }

  return (
    <div ref={sentinelRef} className="py-8 w-full flex justify-center flex-col items-center gap-2">
      {isLoading && (
        <>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Memuat Lebih Banyak...</span>
        </>
      )}
    </div>
  );
};

interface TableContainerProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  height?: string;
  className?: string;
  containerClassName?: string;
}

export const TableContainer: React.FC<TableContainerProps> = ({
  children,
  footer,
  height = 'h-[75vh]',
  className = '',
  containerClassName = ''
}) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm text-gray-900 flex flex-col overflow-hidden ${height} ${containerClassName}`}>
    <div className={`overflow-x-auto overflow-y-auto flex-1 custom-scrollbar scroll-smooth outline-none ${className}`}>
      {children}
    </div>
    {footer}
  </div>
);
