'use client';

import React from 'react';
import { 
  Badge, 
  Avatar, 
  Subtext, 
  H2,
} from '@/components/ui';
import { Task, TaskStage } from '@/lib/types';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { 
  Edit2, 
  Trash2, 
  Calendar, 
  Clock,
  ClipboardList
} from 'lucide-react';
import { BaseDataTable, ColumnConfig } from '@/components/shared/tables/BaseDataTable';

interface Props {
  data: Task[];
  stages: TaskStage[];
  onEdit: (task: Task) => void;
  onDelete: (id: number, title: string) => void;
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
  onSort: (key: string) => void;

  // Selection
  selectedIds?: number[];
  onToggleSelect?: (id: string | number) => void;
  onToggleSelectAll?: () => void;

  // Pagination
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isLoading?: boolean;
}

export const TasksTableView: React.FC<Props> = ({
  data,
  stages,
  onEdit,
  onDelete,
  sortConfig,
  onSort,
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  isLoading,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll
}) => {
  const columns: ColumnConfig<Task>[] = [
    {
      header: 'ID',
      key: 'id',
      sortable: true,
      className: 'w-20 font-mono text-[11px] text-gray-400 py-5 px-6',
      render: (t) => `#${String(t.id).padStart(4, '0')}`
    },
    {
      header: 'Daftar Pekerjaan',
      key: 'title',
      sortable: true,
      render: (t) => (
        <div>
          <H2 className="text-sm text-gray-900 line-clamp-1">{t.title}</H2>
          {t.description && <Subtext className="text-[10px] text-gray-400 mt-0.5 line-clamp-1 italic">{t.description}</Subtext>}
        </div>
      )
    },
    {
      header: 'PIC',
      key: 'assigned_id',
      render: (t) => (
        <div className="flex items-center gap-2">
          <Avatar 
            name={t.assigned_profile?.full_name} 
            src={t.assigned_profile?.avatar_url} 
            size="sm" 
            className="bg-emerald-50 text-emerald-600 border border-emerald-100" 
          />
          <Subtext className="text-[11px] text-gray-700">{t.assigned_profile?.full_name || 'Unassigned'}</Subtext>
        </div>
      )
    },
    {
      header: 'Timeline',
      key: 'start_date',
      sortable: true,
      render: (t) => (
        <div className="space-y-1">
          <Subtext className="text-[10px] text-gray-500 flex items-center gap-1.5 whitespace-nowrap">
            <Calendar size={10} /> {t.start_date ? new Date(t.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
          </Subtext>
          <Subtext className="text-[10px] text-gray-500 flex items-center gap-1.5 whitespace-nowrap">
            <Clock size={10} /> {t.end_date ? new Date(t.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
          </Subtext>
        </div>
      )
    },
    {
      header: 'Status',
      key: 'stage_id',
      sortable: true,
      render: (t) => (
        <Badge variant="secondary" className="px-3 py-1 text-[9px] uppercase rounded-full">
          {stages.find(s => s.id === t.stage_id)?.name || 'Unknown'}
        </Badge>
      )
    },
    {
      header: 'Aksi',
      key: 'actions',
      headerClassName: 'text-center',
      className: 'text-center',
      render: (t) => (
        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ActionButton
            icon={Edit2}
            variant="blue"
            onClick={() => onEdit(t)}
            title="Edit"
          />
          <ActionButton
            icon={Trash2}
            variant="rose"
            onClick={() => onDelete(t.id, t.title)}
            title="Hapus"
          />
        </div>
      )
    }
  ];

  return (
    <BaseDataTable
      data={data}
      columns={columns}
      sortConfig={sortConfig}
      onSort={onSort}
      
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onToggleSelectAll={onToggleSelectAll}

      page={page}
      pageSize={pageSize}
      totalCount={totalCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      isLoading={isLoading}
      
      emptyMessage="Belum ada task pada proyek ini"
      emptyIcon={<ClipboardList size={48} className="mx-auto opacity-10 text-gray-400" />}
    />
  );
};
