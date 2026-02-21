
import React from 'react';
import { Deal, Pipeline } from '@/lib/types';
import { User, Trash2, Edit2, FileText, Plus } from 'lucide-react';

interface Props {
  deals: Deal[];
  pipeline: Pipeline | null;
  onEdit: (deal: Deal) => void;
  onDelete: (id: number) => void;
  onCreateQuotation?: (clientId: number, dealId: number) => void;
  onEditQuotation?: (quotationId: number) => void;

  formatIDR: (num?: number) => string;
  sortConfig: { key: any; direction: 'asc' | 'desc' } | null;
  onSort: (key: any) => void;
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
}

export const DealsTableView: React.FC<Props> = ({ 
  deals, pipeline, onEdit, onDelete, onCreateQuotation, onEditQuotation, formatIDR,
  sortConfig, onSort, selectedIds, onToggleSelect, onToggleSelectAll 
}) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col h-full relative">
      <div className="overflow-x-auto flex-1 custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Deal ID</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Nama Transaksi</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Client / Perusahaan</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Nilai (IDR)</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Tahapan</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Penawaran</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-[11px]">
            {deals.map(d => {
              const stageName = pipeline?.stages?.find(s => s.id === d.stage_id)?.name || '-';
              // Robust handling for 1:1 relation where quotations can be an object or an array
              const quotation: any = Array.isArray(d.quotations) ? d.quotations[0] : d.quotations;

              return (
                <tr key={d.id} className="hover:bg-gray-50/50 group transition-colors">
                  <td className="px-6 py-6 text-gray-400 font-mono">#{String(d.id).padStart(4, '0')}</td>
                  <td className="px-6 py-6">
                    <button onClick={() => onEdit(d)} className="font-bold text-gray-900 hover:text-blue-600 transition-all text-left uppercase tracking-tight">
                      {d.name}
                    </button>
                    <div className="flex items-center gap-1 mt-1 text-[9px] text-gray-400 font-bold uppercase">
                       <User size={10} /> {d.sales_profile?.full_name?.split(' ')[0] || 'Unassigned'}
                    </div>
                  </td>
                  <td className="px-6 py-6">
                     <div className="font-bold text-gray-700">{d.contact_name}</div>
                     <div className="text-[9px] font-medium text-gray-400 italic">{d.customer_company || 'Perorangan'}</div>
                  </td>
                  <td className="px-6 py-6 text-blue-600 font-bold tracking-tight">{formatIDR(d.expected_value)}</td>
                  <td className="px-6 py-6 text-center">
                    <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-[9px] font-bold uppercase tracking-wider border border-gray-200">
                      {stageName}
                    </span>
                  </td>
                  <td className="px-6 py-6 text-center">
                    {quotation ? (
                      <button 
                        onClick={() => onEditQuotation?.(quotation.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[9px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all"
                      >
                        <FileText size={10} /> {quotation.number}
                      </button>
                    ) : (
                      onCreateQuotation && d.client_id && (
                        <button 
                          onClick={() => onCreateQuotation(d.client_id!, d.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full text-[9px] font-bold uppercase tracking-widest hover:bg-indigo-100 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Plus size={10} /> Buat Quote
                        </button>
                      )
                    )}
                  </td>
                  <td className="px-6 py-6 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onEdit(d)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg shadow-sm border border-transparent hover:border-blue-100 transition-all">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => onDelete(d.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg shadow-sm border border-transparent hover:border-rose-100 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {deals.length === 0 && (
               <tr><td colSpan={7} className="py-24 text-center opacity-10 italic text-[10px] uppercase font-bold">Tidak ada transaksi ditemukan</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
