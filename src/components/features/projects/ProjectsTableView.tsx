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
} from 'lucide-react';
import { BaseDataTable, ColumnConfig } from '@/components/shared/tables/BaseDataTable';

interface Props {
  projects: Project[];
  pipeline: ProjectPipeline | null;
  onEdit: (project: Project) => void;
  onDelete: (id: number, name: string) => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  onSort?: (key: string) => void;
}

export const ProjectsTableView: React.FC<Props> = ({
  projects,
  pipeline,
  onEdit,
  onDelete,
  hasMore,
  isLoadingMore,
  onLoadMore,
  sortConfig,
  onSort
}) => {
  const columns: ColumnConfig<Project>[] = [
    {
      header: 'ID',
      key: 'id',
      sortable: true,
      className: 'text-gray-500 font-mono w-20',
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
        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ActionButton
            icon={ListTodo}
            variant="emerald"
            href={`/dashboard/projects/tasks/${project.id}`}
            title="Buka Tasks Proyek"
          />
          <ActionButton
            icon={Edit2}
            variant="blue"
            onClick={() => onEdit(project)}
            title="Edit Proyek"
          />
          <ActionButton
            icon={Trash2}
            variant="rose"
            onClick={() => onDelete(project.id, project.name)}
            title="Hapus Proyek"
          />
        </div>
      )
    }
  ];

  return (
    <BaseDataTable
      data={projects}
      columns={columns}
      sortConfig={sortConfig || null}
      onSort={onSort || (() => {})}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      onLoadMore={onLoadMore}
      emptyMessage="Belum ada proyek terdaftar"
      emptyIcon={<Briefcase size={48} className="mx-auto opacity-10 text-gray-400" />}
    />
  );
};
