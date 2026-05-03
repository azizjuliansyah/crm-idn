import React, { useMemo } from 'react';
import { Badge, Label, Subtext } from '@/components/ui';
import { SupportTicket } from '@/lib/types';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { ActionMenu } from '@/components/shared/ActionMenu';
import { Trash2, Edit2, Zap, Eye, MoreVertical } from 'lucide-react';
import { BaseDataTable, ColumnConfig } from '@/components/shared/tables/BaseDataTable';
import { SortConfig, SortKey } from '@/lib/hooks/useSupportTicketFilters';

interface Props {
  tickets: SupportTicket[];
  onEdit: (t: SupportTicket) => void;
  onDelete: (id: number) => void;
  isLoading?: boolean;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  sortConfig: SortConfig;
  onSort: (key: SortKey) => void;

  // Selection
  selectedIds?: (string | number)[];
  onToggleSelect?: (id: string | number) => void;
  onToggleSelectAll?: () => void;
}

export const ComplaintsTableView: React.FC<Props> = ({ 
  tickets, onEdit, onDelete, isLoading, 
  page, pageSize, totalCount, onPageChange, onPageSizeChange,
  sortConfig, onSort,
  selectedIds, onToggleSelect, onToggleSelectAll
}) => {
  const columns: ColumnConfig<SupportTicket>[] = useMemo(() => [
    {
      header: 'ID',
      key: 'id' as SortKey,
      sortable: true,
      className: 'text-gray-400 font-mono py-5 px-6',
      render: (t: SupportTicket) => `#${String(t.id).padStart(4, '0')}`
    },
    {
      header: 'Rincian Keluhan',
      key: 'title' as SortKey,
      sortable: true,
      render: (t: SupportTicket) => (
        <div>
          <span className="text-sm font-medium text-gray-900">{t.title}</span>
          <div className="flex items-center gap-2 mt-1">
            <Label className="text-[9px] text-gray-600 uppercase italic">{t.client?.name || 'Umum'}</Label>
          </div>
        </div>
      )
    },
    {
      header: 'Topik',
      key: 'topic_id' as any,
      sortable: false,
      render: (t: SupportTicket) => t.ticket_topics?.name ? <span>{t.ticket_topics.name}</span> : <span>-</span>
    },
    {
      header: 'PIC Penanganan',
      key: 'assigned_id' as any,
      sortable: false,
      render: (t: SupportTicket) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center text-[10px] uppercase shadow-sm">
            {t.assigned_profile?.full_name?.charAt(0) || '?'}
          </div>
          <Label className="truncate text-gray-600">{t.assigned_profile?.full_name || '-'}</Label>
        </div>
      )
    },
    {
      header: 'Status',
      key: 'status' as SortKey,
      sortable: true,
      headerClassName: 'text-center uppercase',
      className: 'text-center',
      render: (t: SupportTicket) => (
        <div className="flex flex-col items-center gap-2 border-none">
          <Badge variant={t.status?.toLowerCase() === 'closed' ? 'secondary' : t.status?.toLowerCase() === 'in progress' ? 'danger' : 'neutral'} className="min-w-[90px] w-auto whitespace-nowrap justify-center text-[9px] py-1 uppercase">
            {t.status}
          </Badge>
          {t.priority && t.priority.toLowerCase() !== 'normal' && (
            <div className={`px-2 py-1 rounded-full text-[9px] font-bold tracking-wide uppercase flex items-center gap-1 shadow-sm border ${
              t.priority.toLowerCase() === 'urgent' || t.priority.toLowerCase() === 'high' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-amber-100 text-amber-700 border-amber-200'
            }`}>
              <Zap size={10} fill="currentColor" />
              {t.priority}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Aksi',
      key: 'actions' as any,
      headerClassName: 'text-center',
      className: 'text-center',
      render: (t: SupportTicket) => (
        <div className="flex justify-center">
          <ActionMenu>
            <button
              onClick={() => onEdit(t)}
              className="w-full text-left px-4 py-2.5 text-[11px] font-bold uppercase text-blue-600 hover:bg-blue-50 flex items-center gap-2 transition-none"
            >
              <Eye size={14} />
              Detail Keluhan
            </button>
            <button
              onClick={() => onDelete(t.id)}
              className="w-full text-left px-4 py-2.5 text-[11px] font-bold uppercase text-rose-600 hover:bg-rose-50 border-t border-gray-50 flex items-center gap-2 transition-none"
            >
              <Trash2 size={14} />
              Hapus Keluhan
            </button>
          </ActionMenu>
        </div>
      )
    }
  ], [onEdit, onDelete]);

  return (
    <BaseDataTable
      data={tickets}
      columns={columns}
      isLoading={isLoading}
      sortConfig={sortConfig as any}
      onSort={onSort as any}
      page={page}
      pageSize={pageSize}
      totalCount={totalCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}

      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onToggleSelectAll={onToggleSelectAll}

      emptyMessage="Tidak ada keluhan tercatat"
    />
  );
};
