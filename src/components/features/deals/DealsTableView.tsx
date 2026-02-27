import React from 'react';
import { Button, Table, TableHeader, TableBody, TableRow, TableCell, TableEmpty, Label, Badge } from '@/components/ui';
import { Deal, Pipeline } from '@/lib/types';
import { User, Trash2, Edit2, FileText, Plus, FilePlus, ChevronUp, ChevronDown, Clock } from 'lucide-react';

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

const getStatusVariant = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes('qualified')) return 'sky';
  if (s.includes('proposal')) return 'indigo';
  if (s.includes('negotiation')) return 'amber';
  if (s.includes('closing')) return 'emerald';
  if (s.includes('ghosting')) return 'rose';
  return 'primary';
};

export const DealsTableView: React.FC<Props> = ({
  deals, pipeline, onEdit, onDelete, onCreateQuotation, onEditQuotation, formatIDR,
  sortConfig, onSort, selectedIds, onToggleSelect, onToggleSelectAll
}) => {
  const SortIndicator = ({ column }: { column: string }) => {
    if (sortConfig?.key !== column) return <ChevronUp size={12} className="text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={12} className="text-blue-500 ml-1" /> : <ChevronDown size={12} className="text-blue-500 ml-1" />;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col h-full relative">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-gray-100">
            <TableCell isHeader className="cursor-pointer" onClick={() => onSort('id')}>
              <div className="flex items-center gap-1">ID <SortIndicator column="id" /></div>
            </TableCell>
            <TableCell isHeader className="cursor-pointer" onClick={() => onSort('input_date')}>
              <div className="flex items-center gap-1">Tanggal Input <SortIndicator column="input_date" /></div>
            </TableCell>
            <TableCell isHeader className="cursor-pointer" onClick={() => onSort('name')}>
              <div className="flex items-center gap-1">Informasi Deal <SortIndicator column="name" /></div>
            </TableCell>
            <TableCell isHeader className="cursor-pointer text-center" onClick={() => onSort('probability')}>
              <div className="flex items-center justify-center gap-1">Probabilitas <SortIndicator column="probability" /></div>
            </TableCell>
            <TableCell isHeader className="cursor-pointer" onClick={() => onSort('expected_value')}>
              <div className="flex items-center gap-1">Nilai (EST) <SortIndicator column="expected_value" /></div>
            </TableCell>
            <TableCell isHeader className="cursor-pointer text-center" onClick={() => onSort('stage_id')}>
              <div className="flex items-center justify-center gap-1">Tahapan <SortIndicator column="stage_id" /></div>
            </TableCell>
            <TableCell isHeader className="cursor-pointer" onClick={() => onSort('sales_id')}>
              <div className="flex items-center gap-1">PIC Sales <SortIndicator column="sales_id" /></div>
            </TableCell>
            <TableCell isHeader className=" text-center">Aksi</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deals.map(d => {
            const stageName = pipeline?.stages?.find(s => s.id === d.stage_id)?.name || '-';
            const quotation: any = Array.isArray(d.quotations) ? d.quotations[0] : d.quotations;

            return (
              <TableRow key={d.id} className="group hover:bg-gray-50/30 transition-colors border-b border-gray-50">
                <TableCell className="text-gray-400 w-[100px]">
                  #{String(d.id).padStart(4, '0')}
                </TableCell>

                <TableCell className="py-5">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock size={12} strokeWidth={2.5} />
                    <Label className="text-[11px] ">{d.input_date ? new Date(d.input_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</Label>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="font-bold text-gray-900 mb-1">{d.name}</div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Label className="text-[10px] text-indigo-600 !capitalize !tracking-tight font-medium">{d.contact_name}</Label>
                    <Label className="text-[10px] text-gray-300">•</Label>
                    <Label className="text-[10px] text-gray-400 !capitalize !tracking-tight">{d.customer_company || 'Perorangan'}</Label>
                    {(d.follow_up || 0) > 0 && (
                      <>
                        <Label className="text-[10px] text-gray-300">•</Label>
                        <Label className="px-1.5 py-0.5 bg-amber-50 !text-amber-600 border border-amber-100 rounded text-[9px] font-bold !capitalize !tracking-tight inline-flex items-center gap-1 whitespace-nowrap" title={`${d.follow_up} kali di-follow up`}>
                          FU {d.follow_up}
                        </Label>
                      </>
                    )}
                    {d.follow_up_date && (
                      <>
                        <Label className="text-[10px] text-gray-300">•</Label>
                        <Label className="px-1.5 py-0.5 bg-blue-50 !text-blue-600 border border-blue-100 rounded text-[9px] font-bold !capitalize !tracking-tight inline-flex items-center gap-1 whitespace-nowrap">
                          TGL FU: {new Date(d.follow_up_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </Label>
                      </>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-center w-[120px]">
                  <Badge variant={d.probability && d.probability >= 75 ? 'success' : d.probability && d.probability >= 50 ? 'warning' : 'neutral'} className="!capitalize !tracking-tight text-[10px]">
                    {d.probability || 0}%
                  </Badge>
                </TableCell>

                <TableCell className="w-[250px]">
                  <div className="text-blue-600">
                    {formatIDR(d.expected_value)}
                  </div>
                  <div className="mt-1">
                    {quotation ? (
                      <Button
                        onClick={() => onEditQuotation?.(quotation.id)}
                        size='sm'
                        variant='success'
                      >
                        <FileText size={8} strokeWidth={3} /> {quotation.number}
                      </Button>
                    ) : (
                      onCreateQuotation && d.client_id && (
                        <Button
                          onClick={() => onCreateQuotation(d.client_id!, d.id)}
                          variant='ghost'
                          size='sm'
                        >
                          <Plus size={8} strokeWidth={3} /> Buat Quote
                        </Button>
                      )
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-center py-4 w-[150px]">
                  <Badge variant={getStatusVariant(stageName)} className="!capitalize !tracking-tight">
                    {stageName}
                  </Badge>
                </TableCell>

                <TableCell className="py-4 w-[150px]">
                  <Label className="text-gray-700">
                    {d.sales_profile?.full_name?.split(' ')[0] || '-'}
                  </Label>
                </TableCell>

                <TableCell className="text-center py-4 w-[120px]">
                  <div className="flex items-center justify-center gap-1">
                    {quotation ? (
                      <Button onClick={() => onEditQuotation?.(quotation.id)} variant='ghost' size='sm' className="!p-2 text-emerald-700 !bg-transparent hover:!bg-emerald-50 shadow-none hover:border-emerald-200 transition-all border border-transparent rounded-lg" title="Dokumen Penawaran">
                        <FileText size={15} strokeWidth={2} />
                      </Button>
                    ) : (
                      onCreateQuotation && d.client_id ? (
                        <Button onClick={() => onCreateQuotation(d.client_id!, d.id)} variant='ghost' size='sm' className="!p-2 text-indigo-700 !bg-transparent hover:!bg-indigo-50 shadow-none hover:border-indigo-200 transition-all border border-transparent rounded-lg" title="Buat Penawaran">
                          <FilePlus size={15} strokeWidth={2} />
                        </Button>
                      ) : (
                        <div className="w-[15px]"></div>
                      )
                    )}
                    <Button onClick={() => onEdit(d)} variant='ghost' size='sm' className="!p-2 text-blue-700 !bg-transparent hover:!bg-blue-50 shadow-none hover:border-blue-200 transition-all border border-transparent rounded-lg" title="Edit Transaksi">
                      <Edit2 size={15} strokeWidth={2} />
                    </Button>
                    <Button onClick={() => onDelete(d.id)} variant='ghost' size='sm' className="!p-2 text-rose-700 !bg-transparent hover:!bg-rose-50 shadow-none hover:border-rose-200 transition-all border border-transparent rounded-lg" title="Hapus Transaksi">
                      <Trash2 size={15} strokeWidth={2} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {deals.length === 0 && (
            <TableEmpty colSpan={7} message="Tidak ada transaksi ditemukan" />
          )}
        </TableBody>
      </Table>
    </div>
  );
};
