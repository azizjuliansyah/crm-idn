import React from 'react';
import { Button, Subtext, Label, Badge } from '@/components/ui';
import { SupportTicket, SupportStage } from '@/lib/types';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { ChevronRight, Trash2, LifeBuoy } from 'lucide-react';

import { KanbanBoard, KanbanItem, KanbanStage } from '@/components/shared/KanbanBoard/KanbanBoard';

interface KanbanSupportTicket extends SupportTicket, KanbanItem { }

interface Props {
  stages: SupportStage[];
  ticketsByStatus: Record<string, SupportTicket[]>;
  onEdit: (t: SupportTicket) => void;
  onDelete: (id: number, e: React.MouseEvent) => void;
  onReorder: (itemId: number, newStageId: string, newIndex?: number) => void;
}

const COLORS = ['bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-blue-500', 'bg-indigo-500'];

export const SupportTicketsKanbanView: React.FC<Props> = ({
  stages, ticketsByStatus, onEdit, onDelete, onReorder
}) => {
  const kanbanStages: KanbanStage[] = stages.map((stage, idx) => ({
    id: stage.name.toLowerCase(),
    name: stage.name,
    colorClass: COLORS[idx % COLORS.length]
  }));

  const kanbanItemsByStatus: Record<string, KanbanSupportTicket[]> = {};
  kanbanStages.forEach(stage => {
    kanbanItemsByStatus[stage.id as string] = (ticketsByStatus[stage.id as string] || []).map(t => ({
      ...t,
      status: t.status || ''
    }));
  });

  const renderCard = (t: KanbanSupportTicket, isDragged: boolean) => (
    <div
      onClick={() => onEdit(t)}
      className={`group p-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-gray-200/50 hover:border-rose-300 transition-all cursor-grab active:cursor-grabbing transform hover:-translate-y-1 relative ${isDragged ? 'opacity-30' : ''}`}
    >
      <div className="flex items-start justify-between mb-2 pl-0.5 -mr-1.5 -mt-1">
        <Subtext className="text-[9px] font-extrabold text-gray-400 font-mono  mt-1.5">#{String(t.id).padStart(4, '0')}</Subtext>
        <div className="flex items-center gap-1">
          <Badge variant={t.type === 'complaint' ? 'danger' : 'primary'} className="text-[7px] py-0.5 px-2 border-none ring-1 ring-inset  uppercase">
            {t.type || 'ticket'}
          </Badge>
          <Badge variant={t.priority === 'urgent' ? 'danger' : 'secondary'} className="text-[7px] py-0.5 px-2  uppercase">
            {t.priority}
          </Badge>
          <ActionButton
            icon={Trash2}
            variant="rose"
            onClick={(e) => { e.stopPropagation(); onDelete(t.id, e!); }}
            className="opacity-0 group-hover:opacity-100 transition-all !p-1 shadow-none border-none"
            iconSize={12}
          />
        </div>
      </div>
      <h4 className=" text-[12px] text-gray-900 mb-1 leading-tight group-hover:text-rose-600 transition-colors pr-6 uppercase  line-clamp-2">{t.title}</h4>

      {/* {t.ticket_topics?.name && (
        <div className="mb-2">
          <Badge variant="ghost" className="uppercase  text-[7px] bg-indigo-50 text-indigo-600 border border-indigo-100 py-0.5 px-1.5">
            {t.ticket_topics.name}
          </Badge>
        </div>
      )} */}

      <div className="flex items-center gap-2 mb-3">
        <Subtext className="text-[10px] text-gray-400  uppercase italic truncate flex-1">{t.client?.name || 'Umum'}</Subtext>

      </div>
      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-gray-400 text-[9px] ">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center text-[8px]  shadow-sm uppercase">
            {t.assigned_profile?.full_name?.charAt(0) || '?'}
          </div>
          <Label className=" text-gray-500">{t.assigned_profile?.full_name?.split(' ')[0]}</Label>
        </div>
        <ChevronRight size={12} className="text-gray-300 group-hover:text-rose-400 group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  );

  return (
    <KanbanBoard<KanbanSupportTicket>
      stages={kanbanStages}
      itemsByStatus={kanbanItemsByStatus}
      onReorder={onReorder}
      renderCard={renderCard}
    />
  );
};
