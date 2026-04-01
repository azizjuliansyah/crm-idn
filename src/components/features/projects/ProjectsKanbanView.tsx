'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Badge, 
  Avatar, 
  H2, 
  Subtext
} from '@/components/ui';
import { Project, ProjectPipeline } from '@/lib/types';
import { KanbanBoard, KanbanItem } from '@/components/shared/KanbanBoard/KanbanBoard';
import { 
  ListTodo, 
  Calendar 
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface KanbanProject extends Project, KanbanItem { }

interface Props {
  projects: Project[];
  pipeline: ProjectPipeline | null;
  onEdit: (project: Project) => void;
  onStatusChange: (projectId: number, newStageId: string) => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

const STAGE_COLORS = [
  'bg-blue-600',
  'bg-indigo-600',
  'bg-violet-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-orange-600',
  'bg-rose-600',
];

const getStageColor = (index: number) => {
  return STAGE_COLORS[index % STAGE_COLORS.length];
};

export const ProjectsKanbanView: React.FC<Props> = ({
  projects,
  pipeline,
  onEdit,
  onStatusChange,
  hasMore,
  isLoadingMore,
  onLoadMore
}) => {
  const router = useRouter();

  const projectsByStage = React.useMemo(() => {
    const groups: Record<string, Project[]> = {};
    if (pipeline?.stages) {
      pipeline.stages.forEach(s => groups[s.id] = []);
    }
    projects.forEach(p => {
      if (groups[p.stage_id]) groups[p.stage_id].push(p);
    });
    return groups;
  }, [projects, pipeline]);

  const renderProjectCard = (p: KanbanProject, isDragged: boolean) => (
    <div
      key={p.id}
      onClick={() => onEdit(p)}
      className={`group p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all cursor-pointer relative ${isDragged ? 'opacity-30' : ''}`}
    >
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all">
        <Link
          href={`/dashboard/projects/tasks/${p.id}`}
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={() => router.prefetch(`/dashboard/projects/tasks/${p.id}`)}
          className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg shadow-sm hover:bg-emerald-600 hover:text-white border border-emerald-100 transition-all block"
        >
          <ListTodo size={12} />
        </Link>
      </div>
      <div className="flex items-center justify-between mb-2">
        <Badge variant="ghost" className="px-1.5 py-0 border border-gray-100 text-[7px] text-gray-400 uppercase bg-gray-50">PRJ-{String(p.id).padStart(4, '0')}</Badge>
      </div>
      <H2 className="text-xs font-semibold text-gray-800 mb-0.5 leading-tight group-hover:text-emerald-600 transition-colors uppercase truncate">{p.name}</H2>
      <Subtext className="text-[9px] text-emerald-600 uppercase mb-3 line-clamp-1">{p.client?.name || 'Personal Client'}</Subtext>

      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <div className="flex -space-x-1.5">
          <div title={`Lead: ${p.lead_profile?.full_name}`}>
            <Avatar name={p.lead_profile?.full_name} src={p.lead_profile?.avatar_url} size="sm" className="w-5 h-5 ring-2 ring-emerald-50 shadow-sm" />
          </div>
          {p.team_members?.slice(0, 2).map((tm, idx) => (
            <div key={idx} title={tm.profile?.full_name}>
              <Avatar name={tm.profile?.full_name} src={tm.profile?.avatar_url} size="sm" className="w-5 h-5 ring-2 ring-white shadow-sm" />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1 text-[8px] text-gray-400 uppercase">
          <Calendar size={10} />
          {p.end_date ? new Date(p.end_date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }) : '-'}
        </div>
      </div>
    </div>
  );

  return (
    <KanbanBoard<KanbanProject>
      stages={pipeline?.stages?.map((stage, idx) => ({
        id: stage.id,
        name: stage.name,
        colorClass: getStageColor(idx)
      })) || []}
      itemsByStatus={projectsByStage as Record<string, KanbanProject[]>}
      renderCard={renderProjectCard as any}
      onReorder={(id, status) => onStatusChange(Number(id), status)}
      onLoadMore={onLoadMore}
      hasMoreByStatus={pipeline?.stages ? { [pipeline.stages[pipeline.stages.length-1].id]: !!hasMore } : {}}
      isLoadingMoreByStatus={pipeline?.stages ? { [pipeline.stages[pipeline.stages.length-1].id]: !!isLoadingMore } : {}}
    />
  );
};
