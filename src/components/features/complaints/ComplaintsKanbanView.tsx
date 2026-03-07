import React from 'react';
import { Button, Subtext, Badge } from '@/components/ui';
import { SupportTicket, SupportStage } from '@/lib/types';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { ChevronRight, Trash2, ShieldAlert } from 'lucide-react';

import { KanbanBoard, KanbanItem, KanbanStage } from '@/components/shared/KanbanBoard/KanbanBoard';

interface KanbanComplaintTicket extends SupportTicket, KanbanItem { }

interface Props {
  stages: SupportStage[];
  ticketsByStatus: Record<string, SupportTicket[]>;
  onEdit: (t: SupportTicket) => void;
  onDelete: (id: number, e: React.MouseEvent) => void;
  onReorder: (itemId: number, newStageId: string, newIndex?: number) => void;
}

const COLORS = ['bg-rose-600', 'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-gray-500'];

export const ComplaintsKanbanView: React.FC<Props> = ({
  stages, ticketsByStatus, onEdit, onDelete, onReorder
}) => {
  const kanbanStages: KanbanStage[] = stages.map((stage, idx) => ({
    id: stage.name.toLowerCase(),
    name: stage.name,
    colorClass: COLORS[idx % COLORS.length]
  }));

  const kanbanItemsByStatus: Record<string, KanbanComplaintTicket[]> = {};
  kanbanStages.forEach(stage => {
    kanbanItemsByStatus[stage.id as string] = (ticketsByStatus[stage.id as string] || []).map(t => ({
      ...t,
      status: t.status || ''
    }));
  });

  const renderCard = (t: KanbanComplaintTicket, isDragged: boolean) => (
    <div
      onClick={() => onEdit(t)}
      className={`group p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-rose-300 transition-all cursor-grab active:cursor-grabbing transform hover:-translate-y-1 relative ${isDragged ? 'opacity-30' : ''}`}
    >
      <div className="flex items-start justify-between mb-2 pl-0.5 -mr-1.5 -mt-1">
        <Subtext className="text-[9px]  text-gray-300 uppercase  mt-1.5">#{String(t.id).padStart(4, '0')}</Subtext>
        <div className="flex items-center gap-1">
          <Badge variant={t.priority === 'urgent' ? 'danger' : 'secondary'} className="text-[8px] py-0.5 px-2 uppercase">{t.priority}</Badge>
          <ActionButton
            icon={Trash2}
            variant="rose"
            onClick={(e) => { e.stopPropagation(); onDelete(t.id, e); }}
            className="opacity-0 group-hover:opacity-100 transition-all !p-1 shadow-none border-none"
            iconSize={12}
          />
        </div>
      </div>
      <h4 className=" text-[12px] text-gray-900 mb-1 leading-tight group-hover:text-rose-600 transition-colors pr-6 uppercase  line-clamp-2">{t.title}</h4>

      {t.ticket_topics?.name && (
        <div className="mb-2">
          <Badge variant="ghost" className="uppercase  text-[7px] bg-indigo-50 text-indigo-600 border border-indigo-100 py-0.5 px-1.5">
            {t.ticket_topics.name}
          </Badge>
        </div>
      )}

      <Subtext className="text-[10px] text-gray-400  mb-3 italic truncate">{t.client?.name || 'Client Umum'}</Subtext>
      <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-gray-400 text-[9px] ">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 text-[8px]  uppercase">
            {t.assigned_profile?.full_name?.charAt(0)}
          </div>
          {t.assigned_profile?.full_name?.split(' ')[0] || 'Unassigned'}
        </div>
        <ChevronRight size={12} />
      </div>
    </div>
  );

  return (
    <KanbanBoard<KanbanComplaintTicket>
      stages={kanbanStages}
      itemsByStatus={kanbanItemsByStatus}
      onReorder={onReorder}
      renderCard={renderCard}
    />
  );
};
