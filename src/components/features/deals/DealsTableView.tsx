import React from 'react';
import { Deal, Pipeline } from '@/lib/types';
import { User, Trash2, Edit2, FileText, Plus } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableEmpty } from '@/components/ui';

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
      <Table>
        <TableHeader>
          <tr className="border-b border-gray-100">
            <TableCell isHeader className="text-[10px] font-black uppercase tracking-widest py-4 text-gray-400">ID</TableCell>
            <TableCell isHeader className="text-[10px] font-black uppercase tracking-widest py-4 text-gray-400">Informasi Deal</TableCell>
            <TableCell isHeader className="text-[10px] font-black uppercase tracking-widest py-4 text-gray-400">Nilai (EST)</TableCell>
            <TableCell isHeader className="text-[10px] font-black uppercase tracking-widest py-4 text-gray-400 text-center">Tahapan</TableCell>
            <TableCell isHeader className="text-[10px] font-black uppercase tracking-widest py-4 text-gray-400">PIC Sales</TableCell>
            <TableCell isHeader className="text-[10px] font-black uppercase tracking-widest py-4 text-gray-400 text-center">Aksi</TableCell>
          </tr>
        </TableHeader>
        <TableBody>
          {deals.map(d => {
            const stageName = pipeline?.stages?.find(s => s.id === d.stage_id)?.name || '-';
            const quotation: any = Array.isArray(d.quotations) ? d.quotations[0] : d.quotations;

            return (
              <TableRow key={d.id} className="group hover:bg-gray-50/30 transition-colors border-b border-gray-50">
                <TableCell className="text-[10px] font-bold text-gray-400 py-4 w-[100px]">
                  #{String(d.id).padStart(4, '0')}
                </TableCell>
                
                <TableCell className="py-4">
                  <button onClick={() => onEdit(d)} className="font-bold text-blue-900 text-sm hover:text-blue-600 transition-colors text-left tracking-tight cursor-pointer">
                    {d.name}
                  </button>
                  <div className="flex items-center gap-1.5 mt-1">
                     <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{d.contact_name}</span>
                     <span className="text-[9px] text-gray-300">•</span>
                     <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{d.customer_company || 'PERORANGAN'}</span>
                  </div>
                </TableCell>

                <TableCell className="py-4 w-[250px]">
                   <div className="font-bold text-blue-600 tracking-tight text-sm">
                     {formatIDR(d.expected_value)}
                   </div>
                   <div className="mt-1">
                     {quotation ? (
                       <button 
                         onClick={() => onEditQuotation?.(quotation.id)}
                         className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50/80 text-emerald-600 rounded text-[8px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors"
                       >
                         <FileText size={8} strokeWidth={3} /> {quotation.number}
                       </button>
                     ) : (
                       onCreateQuotation && d.client_id && (
                         <button 
                           onClick={() => onCreateQuotation(d.client_id!, d.id)}
                           className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-400 border border-gray-100 rounded text-[8px] font-black uppercase tracking-widest hover:bg-gray-100 hover:text-gray-600 transition-colors"
                         >
                           <Plus size={8} strokeWidth={3} /> Buat Quote
                         </button>
                       )
                     )}
                   </div>
                </TableCell>

                <TableCell className="text-center py-4 w-[150px]">
                  <span className="whitespace-nowrap px-3 py-1 bg-white text-gray-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-gray-200 shadow-sm">
                    {stageName}
                  </span>
                </TableCell>

                <TableCell className="py-4 w-[150px]">
                   <span className="text-[11px] font-bold text-gray-700 capitalize">
                     {d.sales_profile?.full_name?.split(' ')[0] || '-'}
                   </span>
                </TableCell>

                <TableCell className="text-center py-4 w-[120px]">
                  <div className="flex items-center justify-center gap-3">
                    {quotation ? (
                      <button onClick={() => onEditQuotation?.(quotation.id)} className="text-emerald-400 hover:text-emerald-600 transition-colors cursor-pointer" title="Dokumen Penawaran">
                        <FileText size={15} strokeWidth={2} />
                      </button>
                    ) : (
                      onCreateQuotation && d.client_id ? (
                        <button onClick={() => onCreateQuotation(d.client_id!, d.id)} className="text-emerald-400 hover:text-emerald-600 transition-colors cursor-pointer" title="Buat Penawaran">
                           <FileText size={15} strokeWidth={2} />
                        </button>
                      ) : (
                        <div className="w-[15px]"></div>
                      )
                    )}
                    <button onClick={() => onEdit(d)} className="text-blue-300 hover:text-blue-600 transition-colors cursor-pointer" title="Edit Transaksi">
                      <Edit2 size={15} strokeWidth={2} />
                    </button>
                    <button onClick={() => onDelete(d.id)} className="text-rose-300 hover:text-rose-600 transition-colors cursor-pointer" title="Hapus Transaksi">
                      <Trash2 size={15} strokeWidth={2} />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {deals.length === 0 && (
             <TableEmpty colSpan={6} message="Tidak ada transaksi ditemukan" />
          )}
        </TableBody>
      </Table>
    </div>
  );
};
