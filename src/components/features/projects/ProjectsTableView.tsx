'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Badge, 
  Avatar, 
  Label,
} from '@/components/ui';
import { Project, ProjectPipeline } from '@/lib/types';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { 
  Briefcase, 
  Clock, 
  Calendar, 
  ListTodo, 
  Edit2, 
  Trash2,
  Eye,
  MoreVertical
} from 'lucide-react';
import { ActionMenu } from '@/components/shared/ActionMenu';
import { BaseDataTable, ColumnConfig } from '@/components/shared/tables/BaseDataTable';

interface Props {
  data: Project[];
  pipeline: ProjectPipeline | null;
  onEdit: (project: Project) => void;
  onDelete: (id: number, name: string) => void;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  onSort?: (key: string) => void;

  // Selection
  selectedIds?: (string | number)[];
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

export const ProjectsTableView: React.FC<Props> = ({
  data,
  pipeline,
  onEdit,
  onDelete,
  sortConfig,
  onSort,
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  isLoading
}) => {
  const columns: ColumnConfig<Project>[] = [
    {
      header: 'ID',
      key: 'id',
      sortable: true,
      className: 'w-20 font-mono text-[11px] text-gray-400 py-5 px-6',
      render: (project) => `#${String(project.id).padStart(4, '0')}`
    },
    {
      header: 'Informasi Proyek',
      key: 'name',
      sortable: true,
      render: (project) => (
        <div className="flex flex-col">
          <Link
            href={`/dashboard/projects/tasks/${project.id}`}
            className="text-sm font-semibold text-gray-900 hover:text-emerald-600 transition-colors block uppercase"
          >
            {project.name}
          </Link>
          <div className="text-[10px] text-emerald-600 font-medium uppercase mt-1">
            {project.client?.name || 'Personal Client'}
          </div>
        </div>
      )
    },
    {
      header: 'Lead & Team',
      key: 'team',
      render: (project) => (
        <div className="flex items-center gap-2">
          <div title={`Lead: ${project.lead_profile?.full_name}`}>
            <Avatar name={project.lead_profile?.full_name} src={project.lead_profile?.avatar_url} size="sm" className="ring-2 ring-emerald-50 shadow-sm" />
          </div>
          <div className="flex -space-x-2">
            {project.team_members?.slice(0, 3).map((tm, idx) => (
              <div key={idx} title={tm.profile?.full_name}>
                <Avatar name={tm.profile?.full_name} src={tm.profile?.avatar_url} size="sm" className="w-6 h-6 ring-2 ring-white shadow-sm" />
              </div>
            ))}
            {(project.team_members?.length || 0) > 3 && (
              <div className="w-6 h-6 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-[8px] text-gray-400 ring-2 ring-white">
                +{(project.team_members?.length || 0) - 3}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      header: 'Timeline',
      key: 'start_date',
      sortable: true,
      render: (project) => (
        <div className="flex flex-col gap-1">
          <Label className="text-xs font-medium text-gray-700 uppercase">
            {project.lead_profile?.full_name || '-'}
          </Label>
          <div className="flex items-center gap-1.5 text-[9px] text-gray-400 uppercase">
            <Clock size={10} />
            {project.start_date ? new Date(project.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
            {project.end_date ? ` - ${new Date(project.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}` : ''}
          </div>
        </div>
      )
    },
    {
      header: 'Tahapan',
      key: 'stage_id',
      sortable: true,
      render: (project) => (
        <div className="flex flex-col gap-1.5">
          <Badge variant="ghost" className="px-2 py-0.5 border border-emerald-100 text-[9px] text-emerald-600 uppercase bg-emerald-50/50 w-fit">
            {pipeline?.stages?.find(s => s.id === project.stage_id)?.name || 'Unknown'}
          </Badge>
          {project.end_date && (
            <div className="flex items-center gap-1 text-[9px] text-gray-400 uppercase px-1">
              <Calendar size={10} />
              Deadline: {new Date(project.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Aksi',
      key: 'actions',
      headerClassName: 'text-center',
      className: 'text-center',
      render: (project) => (
        <div className="flex justify-center">
          <ActionMenu>
            <Link
              href={`/dashboard/projects/tasks/${project.id}`}
              className="w-full text-left px-4 py-2.5 text-[11px] font-bold uppercase text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 transition-none"
              onClick={(e) => e.stopPropagation()}
            >
              <ListTodo size={14} />
              Daftar Tugas
            </Link>
            
            <button
              onClick={() => onEdit(project)}
              className="w-full text-left px-4 py-2.5 text-[11px] font-bold uppercase text-blue-600 hover:bg-blue-50 border-t border-gray-50 flex items-center gap-2 transition-none"
            >
              <Eye size={14} />
              Detail Proyek
            </button>
            
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(project.id, project.name); }}
              className="w-full text-left px-4 py-2.5 text-[11px] font-bold uppercase text-rose-600 hover:bg-rose-50 border-t border-gray-50 flex items-center gap-2 transition-none"
            >
              <Trash2 size={14} />
              Hapus Proyek
            </button>
          </ActionMenu>
        </div>
      )
    }
  ];

  return (
    <BaseDataTable
      data={data}
      columns={columns}
      sortConfig={sortConfig || null}
      onSort={onSort || (() => {})}
      
      page={page}
      pageSize={pageSize}
      totalCount={totalCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      isLoading={isLoading}

      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onToggleSelectAll={onToggleSelectAll}
      
      emptyMessage="Belum ada proyek terdaftar"
      emptyIcon={<Briefcase size={48} className="mx-auto opacity-10 text-gray-400" />}
    />
  );
};
