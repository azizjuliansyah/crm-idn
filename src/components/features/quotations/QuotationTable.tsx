import React from 'react';
import { 
  Table, TableHeader, TableBody, TableRow, TableCell, 
  Badge, Label, Subtext, EmptyState, InfiniteScrollSentinel 
} from '@/components/ui';
import { Clock, FileCheck, FileDown, FilePlus, Edit2, Trash2, FileText, MoreVertical, Eye } from 'lucide-react';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { ActionMenu } from '@/components/shared/ActionMenu';
import { Quotation } from '@/lib/types';
import { formatIDR } from '@/lib/utils/formatters';
import Link from 'next/link';
import { SortKey } from '@/lib/hooks/useQuotationFilters';

interface QuotationTableProps {
  quotations: Quotation[];
  onSort: (key: SortKey) => void;
  onDownload: (q: Quotation) => void;
  onRequest: (qId: number, status: string) => void;
  onDelete: (id: number, number: string) => void;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  loadMore: () => void;
}

export const QuotationTable: React.FC<QuotationTableProps> = ({
  quotations,
  onSort,
  onDownload,
  onRequest,
  onDelete,
  isLoading,
  isLoadingMore,
  hasMore,
  loadMore
}) => {
  return (
    <Table>
      <TableHeader className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md border-b border-gray-100">
        <TableRow className="hover:bg-transparent">
          <TableCell isHeader>ID</TableCell>
          <TableCell onClick={() => onSort('date')} isHeader className="cursor-pointer">Tanggal</TableCell>
          <TableCell onClick={() => onSort('number')} isHeader className="cursor-pointer">Nomor</TableCell>
          <TableCell onClick={() => onSort('client')} isHeader className="cursor-pointer">Pelanggan</TableCell>
          <TableCell onClick={() => onSort('total')} isHeader className="cursor-pointer text-center">Total</TableCell>
          <TableCell onClick={() => onSort('status')} isHeader className="cursor-pointer text-center">Status</TableCell>
          <TableCell isHeader className="text-center">Aksi</TableCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {quotations.map(q => (
          <TableRow key={q.id} className="group hover:bg-indigo-50/30 transition-colors border-b border-gray-50/50 last:border-0">
            <TableCell className="text-[10px] text-gray-500 py-5">#{q.id}</TableCell>
            <TableCell className="py-5">
              <div className="flex items-center gap-2 text-gray-400">
                <Clock size={12} strokeWidth={2.5} />
                <Label className="text-[11px] ">{new Date(q.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</Label>
              </div>
            </TableCell>
            <TableCell className="py-5">
              <Badge variant="secondary" className="gap-1.5 rounded-lg">
                <FileCheck size={10} strokeWidth={2.5} />
                <Label className="!text-indigo-600">{q.number}</Label>
              </Badge>
            </TableCell>
            <TableCell className="py-5 px-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center  text-[10px] uppercase shadow-sm border border-indigo-100">{q.client?.name.charAt(0)}</div>
                <div>
                  <Subtext className="text-xs text-gray-900 ">{q.client?.name}</Subtext>
                  <Subtext className="text-[10px] !text-gray-400 mt-1 uppercase  italic">{q.client?.client_company?.name || 'Personal'}</Subtext>
                </div>
              </div>
            </TableCell>
            <TableCell className="text-right text-indigo-600 text-xs py-5 px-6 bg-indigo-50/5 group-hover:bg-indigo-50/20">{formatIDR(q.total)}</TableCell>
            <TableCell className="text-center py-5 px-6">
              <Badge variant={
                q.status === 'Draft' ? 'neutral' :
                  q.status === 'Sent' ? 'indigo' :
                    q.status === 'Accepted' ? 'emerald' :
                      'rose'
              }>
                {q.status}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex justify-center">
                <ActionMenu>
                  <button
                    onClick={() => onDownload(q)}
                    className="w-full text-left px-4 py-2.5 text-[11px] font-bold uppercase text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 transition-none"
                  >
                    <FileDown size={14} />
                    Unduh PDF
                  </button>
                  <button
                    onClick={() => onRequest(q.id, q.status)}
                    className="w-full text-left px-4 py-2.5 text-[11px] font-bold uppercase text-indigo-600 hover:bg-indigo-50 border-t border-gray-50 flex items-center gap-2 transition-none"
                  >
                    <FilePlus size={14} />
                    Request Tambahan
                  </button>
                  <Link
                    href={`/dashboard/sales/quotations/${q.id}`}
                    className="w-full text-left px-4 py-2.5 text-[11px] font-bold uppercase text-blue-600 hover:bg-blue-50 border-t border-gray-50 flex items-center gap-2 transition-none"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Eye size={14} />
                    Edit Penawaran
                  </Link>
                  <button
                    onClick={() => onDelete(q.id, q.number)}
                    className="w-full text-left px-4 py-2.5 text-[11px] font-bold uppercase text-rose-600 hover:bg-rose-50 border-t border-gray-50 flex items-center gap-2 transition-none"
                  >
                    <Trash2 size={14} />
                    Hapus Penawaran
                  </button>
                </ActionMenu>
              </div>
            </TableCell>
          </TableRow>
        ))}
        <InfiniteScrollSentinel 
          onIntersect={loadMore}
          enabled={!!hasMore}
          isLoading={!!isLoadingMore}
          colSpan={7}
        />
        {quotations.length === 0 && !isLoading && (
          <TableRow>
            <TableCell colSpan={7} className="p-0">
              <EmptyState icon={<FileText size={48} />} title="Belum ada penawaran tercatat" />
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
