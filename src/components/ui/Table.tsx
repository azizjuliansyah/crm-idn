import React from 'react';

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

export const TableBody: React.FC<TableProps> = ({ children, className = '' }) => (
  <tbody className={`divide-y divide-gray-50 ${className}`}>
    {children}
  </tbody>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ children, className = '', ...props }) => (
  <tr className={`hover:bg-gray-50/30 group transition-colors ${className}`} {...props}>
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
          className={`px-4 py-3 text-[12px] font-medium text-gray-400 uppercase tracking-tight border-b border-gray-100 ${className}`}
          {...props}
        >
          {children}
        </th>
      );
    }
    return (
      <td
        ref={ref}
        className={`px-4 py-3 font-medium text-[14px] ${className}`}
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
      <p className="text-gray-300 font-medium uppercase text-[10px] tracking-tight italic opacity-30">
        {message}
      </p>
    </td>
  </tr>
);
