import React from 'react';
import { Lead } from '@/lib/types';
import { Table as TableIcon, Trash2, ChevronUp, ChevronDown, Check as CheckIcon } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableEmpty, Badge, Button } from '@/components/ui';

interface Props {
  leads: Lead[];
  // Change key type to any to support keyof Lead | 'sales_name' from parent state
  sortConfig: { key: any; direction: 'asc' | 'desc' } | null;
  onSort: (key: any) => void;
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onEdit: (lead: Lead) => void;
  onDelete: (id: number) => void;
  formatIDR: (num?: number) => string;
}

export const LeadsTableView: React.FC<Props> = ({ 
  leads, sortConfig, onSort, selectedIds, onToggleSelect, 
  onToggleSelectAll, onEdit, onDelete, formatIDR 
}) => {
  const SortIndicator = ({ column }: { column: string }) => {
    if (sortConfig?.key !== column) return <ChevronUp size={12} className="text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={12} className="text-blue-500 ml-1" /> : <ChevronDown size={12} className="text-blue-500 ml-1" />;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col h-full relative">
      <Table>
        <TableHeader>
          <TableRow>
            <TableCell isHeader className="w-10 text-center">
              <button onClick={onToggleSelectAll} className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all mx-auto cursor-pointer ${leads.length > 0 && selectedIds.length === leads.length ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-transparent'}`}><CheckIcon size={12} strokeWidth={4} /></button>
            </TableCell>
            <TableCell isHeader className="cursor-pointer" onClick={() => onSort('id')}>ID <SortIndicator column="id" /></TableCell>
            <TableCell isHeader className="cursor-pointer" onClick={() => onSort('name')}>Lead <SortIndicator column="name" /></TableCell>
            <TableCell isHeader>Nilai (Est)</TableCell>
            <TableCell isHeader className="cursor-pointer" onClick={() => onSort('sales_name')}>PIC <SortIndicator column="sales_name" /></TableCell>
            <TableCell isHeader className="cursor-pointer text-center" onClick={() => onSort('status')}>Status <SortIndicator column="status" /></TableCell>
            <TableCell isHeader className="text-center">Aksi</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length === 0 ? (
            <TableEmpty colSpan={7} message="Tidak ada lead yang ditemukan" />
          ) : (
            leads.map(lead => (
              <TableRow key={lead.id}>
                <TableCell className="text-center">
                  <button onClick={() => onToggleSelect(lead.id)} className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all mx-auto cursor-pointer ${selectedIds.includes(lead.id) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-transparent'}`}><CheckIcon size={12} strokeWidth={4} /></button>
                </TableCell>
                <TableCell className="text-gray-400 font-mono">#{String(lead.id).padStart(4, '0')}</TableCell>
                <TableCell>
                  <button onClick={() => onEdit(lead)} className="font-bold text-gray-900 hover:text-blue-600 transition-all text-left block cursor-pointer">
                    {lead.salutation && <span className="text-blue-400 font-bold mr-1">{lead.salutation}</span>}
                    {lead.name}
                  </button>
                  <p className="text-[9px] text-gray-400 font-medium mt-1 uppercase tracking-tighter">{lead.client_company?.name || 'Perorangan'}</p>
                </TableCell>
                <TableCell className="font-bold text-gray-600">{formatIDR(lead.expected_value)}</TableCell>
                <TableCell className="text-gray-600 font-bold">{lead.sales_profile?.full_name || '-'}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="primary">{lead.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onEdit(lead)} 
                      className="!p-2 text-blue-500 hover:bg-blue-50"
                    >
                      <TableIcon size={14} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => { e.stopPropagation(); onDelete(lead.id); }} 
                      className="!p-2 text-rose-700 !bg-transparent hover:!bg-rose-50 shadow-none hover:border-rose-200 transition-all border border-transparent rounded-lg"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
