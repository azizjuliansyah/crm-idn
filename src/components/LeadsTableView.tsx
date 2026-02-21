
import React from 'react';
import { Lead } from '@/lib/types';
import { Table as TableIcon, Trash2, ChevronUp, ChevronDown, Check as CheckIcon } from 'lucide-react';

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
      <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm">
            <tr>
              <th className="px-4 py-4 border-b border-gray-100 w-10 text-center">
                <button onClick={onToggleSelectAll} className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all mx-auto ${leads.length > 0 && selectedIds.length === leads.length ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-transparent'}`}><CheckIcon size={12} strokeWidth={4} /></button>
              </th>
              <th onClick={() => onSort('id')} className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 cursor-pointer">ID <SortIndicator column="id" /></th>
              <th onClick={() => onSort('name')} className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 cursor-pointer">Lead <SortIndicator column="name" /></th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Nilai (Est)</th>
              <th onClick={() => onSort('sales_name')} className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 cursor-pointer">PIC <SortIndicator column="sales_name" /></th>
              <th onClick={() => onSort('status')} className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 cursor-pointer text-center">Status <SortIndicator column="status" /></th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-[11px]">
            {leads.map(lead => (
              <tr key={lead.id} className="hover:bg-gray-50/50 group transition-colors">
                <td className="px-4 py-6 text-center">
                  <button onClick={() => onToggleSelect(lead.id)} className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all mx-auto ${selectedIds.includes(lead.id) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-transparent'}`}><CheckIcon size={12} strokeWidth={4} /></button>
                </td>
                <td className="px-4 py-6 text-gray-400 font-mono">#{String(lead.id).padStart(4, '0')}</td>
                <td className="px-6 py-6 text-left">
                  <button onClick={() => onEdit(lead)} className="font-bold text-gray-900 hover:text-blue-600 transition-all text-left">
                      {lead.salutation && <span className="text-blue-400 font-bold mr-1">{lead.salutation}</span>}
                      {lead.name}
                  </button>
                  <p className="text-[9px] text-gray-400 font-medium mt-1 uppercase tracking-tighter">{lead.client_company?.name || 'Perorangan'}</p>
                </td>
                <td className="px-6 py-6 font-bold text-gray-600">{formatIDR(lead.expected_value)}</td>
                <td className="px-6 py-6 text-left text-gray-600 font-bold">{lead.sales_profile?.full_name || '-'}</td>
                <td className="px-6 py-6 text-center">
                  <span className={`px-3 py-1 text-[9px] font-bold uppercase rounded-full border bg-blue-50 text-blue-600 border-blue-100`}>{lead.status}</span>
                </td>
                <td className="px-6 py-6 text-center">
                  <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(lead)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><TableIcon size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(lead.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
