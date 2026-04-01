'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Badge, 
  Label,
  Avatar, 
  ComboBox,
} from '@/components/ui';
import { Deal, Pipeline } from '@/lib/types';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { 
  Trash2, 
  Edit2, 
  FileText, 
  Plus, 
  FilePlus, 
  Clock, 
  Zap,
  TrendingUp
} from 'lucide-react';
import { formatIDR } from '@/lib/utils/formatters';
import { BaseDataTable, ColumnConfig } from '@/components/shared/tables/BaseDataTable';

interface Props {
  deals: Deal[];
  pipeline: Pipeline | null;
  onEdit: (deal: Deal) => void;
  onDelete: (id: number) => void;
  onCreateQuotation?: (clientId: number, dealId: number) => void;
  onEditQuotation?: (quotationId: number) => void;

  sortConfig: { key: any; direction: 'asc' | 'desc' } | null;
  onSort: (key: any) => void;
  selectedIds: number[];
  onToggleSelect: (id: string | number) => void;
  onToggleSelectAll: () => void;
  onToggleUrgency: (id: number, current: boolean) => void;
  onUpdateStage: (id: number, stageId: string | number) => void;
  hasUrgency?: boolean;

  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

export const DealsTableView: React.FC<Props> = ({
  deals,
  pipeline,
  onEdit,
  onDelete,
  onCreateQuotation,
  onEditQuotation,
  sortConfig,
  onSort,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onToggleUrgency,
  onUpdateStage,
  hasMore,
  isLoadingMore,
  onLoadMore
}) => {
  const getStatusVariant = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('qualified')) return 'sky';
    if (s.includes('proposal')) return 'indigo';
    if (s.includes('negotiation')) return 'amber';
    if (s.includes('closing')) return 'emerald';
    if (s.includes('ghosting')) return 'rose';
    return 'primary';
  };

  const columns: ColumnConfig<Deal>[] = [
    {
      header: 'ID',
      key: 'id',
      sortable: true,
      className: 'text-gray-500 font-mono w-20',
      render: (deal) => (
        <span 
          className="cursor-pointer hover:text-blue-600 transition-colors hover:underline"
          onClick={() => onEdit(deal)}
        >
          #{String(deal.id).padStart(4, '0')}
        </span>
      )
    },
    {
      header: 'Tanggal Input',
      key: 'input_date',
      sortable: true,
      render: (deal) => (
        <div className="flex items-center gap-2 text-gray-400">
          <Clock size={12} strokeWidth={2.5} />
          <Label className="text-[11px]">
            {deal.input_date ? new Date(deal.input_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
          </Label>
        </div>
      )
    },
    {
      header: 'Informasi Deal',
      key: 'name',
      sortable: true,
      render: (deal) => (
        <div>
          <div 
            className={`font-bold text-gray-900 mb-1 cursor-pointer hover:text-blue-600 transition-colors hover:underline ${deal.is_urgent ? 'text-amber-900' : ''}`}
            onClick={() => onEdit(deal)}
          >
            {deal.name}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Label 
              className="text-[10px] text-indigo-600 !capitalize font-medium cursor-pointer hover:text-indigo-800"
              onClick={() => onEdit(deal)}
            >
              {deal.contact_name}
            </Label>
            <Label className="text-[10px] text-gray-300">•</Label>
            <Label className="text-[10px] text-gray-400 !capitalize">{deal.customer_company || 'Perorangan'}</Label>
            {(deal.follow_up || 0) > 0 && (
              <>
                <Label className="text-[10px] text-gray-300">•</Label>
                <Label className="px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded text-[9px] font-bold !capitalize inline-flex items-center gap-1 whitespace-nowrap" title={`${deal.follow_up} kali di-follow up`}>
                  FU {deal.follow_up}
                </Label>
              </>
            )}
          </div>
        </div>
      )
    },
    {
      header: 'Probabilitas',
      key: 'probability',
      sortable: true,
      className: 'text-center',
      headerClassName: 'text-center',
      render: (deal) => (
        <Badge variant={deal.probability && deal.probability >= 75 ? 'success' : deal.probability && deal.probability >= 50 ? 'warning' : 'neutral'} className="!capitalize text-[10px]">
          {deal.probability || 0}%
        </Badge>
      )
    },
    {
      header: 'Nilai (EST)',
      key: 'expected_value',
      sortable: true,
      render: (deal) => {
        const quotation: any = Array.isArray(deal.quotations) ? deal.quotations[0] : deal.quotations;
        return (
          <div>
            <div className="text-blue-600 font-semibold">{formatIDR(deal.expected_value)}</div>
            <div className="mt-1">
              {quotation ? (
                <Link
                  href={`/dashboard/sales/quotations/${quotation.id}`}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500 text-white rounded-md text-[10px] font-bold uppercase transition-colors hover:bg-emerald-600 shadow-sm"
                >
                  <FileText size={8} strokeWidth={3} /> {quotation.number}
                </Link>
              ) : (
                onCreateQuotation && deal.client_id && (
                  <Link
                    href={`/dashboard/sales/quotations/create?client_id=${deal.client_id}&deal_id=${deal.id}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-gray-400 hover:text-indigo-600 text-[10px] font-medium transition-colors"
                  >
                    <Plus size={8} strokeWidth={3} /> Buat Quote
                  </Link>
                )
              )}
            </div>
          </div>
        );
      }
    },
    {
      header: 'Tahapan',
      key: 'stage_id',
      sortable: true,
      className: 'text-center',
      headerClassName: 'text-center',
      render: (deal) => (
        <ComboBox
          value={deal.stage_id}
          onChange={(val) => onUpdateStage(deal.id, val)}
          options={(pipeline?.stages || []).map(s => ({
            value: s.id,
            label: s.name.toUpperCase()
          }))}
          className="w-40 mx-auto"
          size="sm"
          variant="badge"
          badgeVariant={getStatusVariant(pipeline?.stages?.find(s => s.id === deal.stage_id)?.name || '')}
          hideSearch
          triggerClassName="border-none shadow-none ml-auto mr-auto"
          placeholderSize="text-[9px] font-bold"
        />
      )
    },
    {
      header: 'PIC Sales',
      key: 'sales_id',
      sortable: true,
      render: (deal) => (
        <div className="flex items-center gap-2">
          <Avatar 
            name={deal.sales_profile?.full_name} 
            src={deal.sales_profile?.avatar_url} 
            size="sm" 
            className="bg-blue-50 text-blue-600 border border-blue-100" 
          />
          <Label className="text-gray-700 font-medium">
            {deal.sales_profile?.full_name?.split(' ')[0] || '-'}
          </Label>
        </div>
      )
    },
    {
      header: 'Aksi',
      key: 'actions',
      headerClassName: 'text-center',
      className: 'text-center',
      render: (deal) => {
        const quotation: any = Array.isArray(deal.quotations) ? deal.quotations[0] : deal.quotations;
        return (
          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <ActionButton
              icon={Zap}
              variant={deal.is_urgent ? 'amber' : 'gray'}
              onClick={(e) => { e.stopPropagation(); onToggleUrgency(deal.id, !!deal.is_urgent); }}
              title={deal.is_urgent ? 'Hapus Prioritas' : 'Tandai Prioritas'}
              className={deal.is_urgent ? 'animate-pulse' : ''}
            />
            {quotation ? (
              <ActionButton
                icon={FileText}
                variant="emerald"
                href={`/dashboard/sales/quotations/${quotation.id}`}
                title="Dokumen Penawaran"
              />
            ) : (
              onCreateQuotation && deal.client_id && (
                <ActionButton
                  icon={FilePlus}
                  variant="indigo"
                  href={`/dashboard/sales/quotations/create?client_id=${deal.client_id}&deal_id=${deal.id}`}
                  title="Buat Penawaran"
                />
              )
            )}
            <ActionButton
              icon={Edit2}
              variant="blue"
              onClick={() => onEdit(deal)}
              title="Edit Transaksi"
            />
            <ActionButton
              icon={Trash2}
              variant="rose"
              onClick={() => onDelete(deal.id)}
              title="Hapus Transaksi"
            />
          </div>
        );
      }
    }
  ];

  return (
    <BaseDataTable
      data={deals}
      columns={columns}
      sortConfig={sortConfig}
      onSort={onSort}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onToggleSelectAll={onToggleSelectAll}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      onLoadMore={onLoadMore}
      emptyMessage="Tidak ada transaksi ditemukan"
      emptyIcon={<TrendingUp size={48} className="mx-auto opacity-10 text-gray-400" />}
      rowClassName={(deal) => deal.is_urgent ? '!border-l-4 !border-l-amber-400 !bg-amber-50/50' : ''}
    />
  );
};
