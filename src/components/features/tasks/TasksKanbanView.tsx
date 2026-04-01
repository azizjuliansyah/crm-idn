'use client';

import React from 'react';
import { 
  Badge, 
  Avatar, 
  H2, 
  Label 
} from '@/components/ui';
import { Task, TaskStage } from '@/lib/types';
import { KanbanBoard, KanbanItem } from '@/components/shared/KanbanBoard/KanbanBoard';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { Calendar, Trash2 } from 'lucide-react';

interface KanbanTask extends Task, KanbanItem { }

interface Props {
  tasks: Task[];
  stages: TaskStage[];
  onEdit: (task: Task) => void;
  onDelete: (id: number, title: string) => void;
  onStatusChange: (taskId: number, newStageId: string) => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

const getStageColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'todo':
    case 'to do': return 'bg-sky-500';
    case 'in progress':
    case 'working': return 'bg-amber-500';
    case 'done':
    case 'completed': return 'bg-emerald-500';
    case 'on hold': return 'bg-gray-500';
    case 'cancelled': return 'bg-rose-500';
    default: return 'bg-blue-500';
  }
};

export const TasksKanbanView: React.FC<Props> = ({
  tasks,
  stages,
  onEdit,
  onDelete,
  onStatusChange,
  hasMore,
  isLoadingMore,
  onLoadMore
}) => {
  const renderTaskCard = (t: KanbanTask, isDragged: boolean) => (
    <div
      onClick={() => onEdit(t)}
      className={`group p-3.5 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all cursor-pointer relative ${isDragged ? 'opacity-30' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <Badge variant="ghost" className="px-1.5 py-0 border border-gray-100 text-[7px] text-gray-400 uppercase bg-gray-50">T-{String(t.id).padStart(3, '0')}</Badge>
        <ActionButton
          icon={Trash2}
          variant="rose"
          onClick={(e) => { e.stopPropagation(); onDelete(t.id, t.title); }}
          className="opacity-0 group-hover:opacity-100 !p-1 h-fit"
          iconSize={12}
        />
      </div>
      <H2 className="text-[12px] font-semibold text-gray-800 mb-3 leading-tight group-hover:text-emerald-600 transition-colors uppercase line-clamp-2">{t.title}</H2>
      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <div className="flex items-center gap-1.5">
          <Avatar name={t.assigned_profile?.full_name} src={t.assigned_profile?.avatar_url} size="sm" className="w-5 h-5 ring-2 ring-white shadow-sm " />
          <Label className="text-[8px] text-gray-400 uppercase ">{t.assigned_profile?.full_name?.split(' ')[0] || 'TBD'}</Label>
        </div>
        {t.end_date && (
          <div className={`flex items-center gap-1 text-[8px] uppercase ${new Date(t.end_date) < new Date() ? 'text-rose-500' : 'text-gray-400'}`}>
            <Calendar size={10} />
            {new Date(t.end_date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
          </div>
        )}
      </div>
    </div>
  );

  const itemsByStatus = React.useMemo(() => {
    const groups: Record<string, KanbanTask[]> = {};
    stages.forEach(s => groups[s.id] = []);
    tasks.forEach(t => {
      if (groups[t.stage_id]) {
        groups[t.stage_id].push({
          ...t,
          status: t.stage_id
        });
      }
    });
    return groups;
  }, [tasks, stages]);

  return (
    <KanbanBoard<KanbanTask>
      stages={stages.map(s => ({
        id: s.id,
        name: s.name,
        colorClass: getStageColor(s.name)
      }))}
      itemsByStatus={itemsByStatus}
      renderCard={renderTaskCard as any}
      onReorder={onStatusChange}
      onLoadMore={onLoadMore}
      hasMoreByStatus={stages.length > 0 ? { [stages[stages.length - 1].id]: !!hasMore } : {}}
      isLoadingMoreByStatus={stages.length > 0 ? { [stages[stages.length - 1].id]: !!isLoadingMore } : {}}
    />
  );
};
