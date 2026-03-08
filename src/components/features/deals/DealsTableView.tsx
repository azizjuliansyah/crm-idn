import React from 'react';
import { Button, Table, TableHeader, TableBody, TableRow, TableCell, TableEmpty, Label, Badge } from '@/components/ui';
import { Deal, Pipeline } from '@/lib/types';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { User, Trash2, Edit2, FileText, Plus, FilePlus, ChevronUp, ChevronDown, Clock, Zap } from 'lucide-react';

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
  onToggleUrgency: (id: number, current: boolean) => void;
  hasUrgency?: boolean;
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
  sortConfig, onSort, selectedIds, onToggleSelect, onToggleSelectAll, onToggleUrgency, hasUrgency
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
              <TableRow key={d.id} className={`group hover:bg-gray-50/30 transition-colors border-b border-gray-50 ${d.is_urgent ? '!border-l-3 !border-l-amber-400 !bg-amber-50 even:!bg-amber-100/60 hover:!bg-amber-100/60 transition-colors' : ''}`}>
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
                  <div className={`font-bold text-gray-900 mb-1 ${d.is_urgent ? 'text-amber-900' : ''}`}>{d.name}</div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Label className="text-[10px] text-indigo-600 !capitalize ! font-medium">{d.contact_name}</Label>
                    <Label className="text-[10px] text-gray-300">•</Label>
                    <Label className="text-[10px] text-gray-400 !capitalize !">{d.customer_company || 'Perorangan'}</Label>
                    {(d.follow_up || 0) > 0 && (
                      <>
                        <Label className="text-[10px] text-gray-300">•</Label>
                        <Label className="px-1.5 py-0.5 bg-amber-50 !text-amber-600 border border-amber-100 rounded text-[9px] font-bold !capitalize ! inline-flex items-center gap-1 whitespace-nowrap" title={`${d.follow_up} kali di-follow up`}>
                          FU {d.follow_up}
                        </Label>
                      </>
                    )}
                    {d.follow_up_date && (
                      <>
                        <Label className="text-[10px] text-gray-300">•</Label>
                        <Label className="px-1.5 py-0.5 bg-blue-50 !text-blue-600 border border-blue-100 rounded text-[9px] font-bold !capitalize ! inline-flex items-center gap-1 whitespace-nowrap">
                          TGL FU: {new Date(d.follow_up_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </Label>
                      </>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-center w-[120px]">
                  <Badge variant={d.probability && d.probability >= 75 ? 'success' : d.probability && d.probability >= 50 ? 'warning' : 'neutral'} className="!capitalize ! text-[10px]">
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
                  <Badge variant={getStatusVariant(stageName)} className="!capitalize !">
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
                    <ActionButton
                      icon={Zap}
                      variant={d.is_urgent ? 'amber' : 'gray'}
                      onClick={(e) => { e.stopPropagation(); onToggleUrgency(d.id, !!d.is_urgent); }}
                      title={d.is_urgent ? 'Hapus Urgensi' : 'Tandai Urgent'}
                      className={d.is_urgent ? 'animate-pulse' : ''}
                    />
                    {quotation ? (
                      <ActionButton
                        icon={FileText}
                        variant="emerald"
                        onClick={() => onEditQuotation?.(quotation.id)}
                        title="Dokumen Penawaran"
                      />
                    ) : (
                      onCreateQuotation && d.client_id ? (
                        <ActionButton
                          icon={FilePlus}
                          variant="indigo"
                          onClick={() => onCreateQuotation(d.client_id!, d.id)}
                          title="Buat Penawaran"
                        />
                      ) : (
                        <div className="w-[15px]"></div>
                      )
                    )}
                    <ActionButton
                      icon={Edit2}
                      variant="blue"
                      onClick={() => onEdit(d)}
                      title="Edit Transaksi"
                    />
                    <ActionButton
                      icon={Trash2}
                      variant="rose"
                      onClick={() => onDelete(d.id)}
                      title="Hapus Transaksi"
                    />
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
