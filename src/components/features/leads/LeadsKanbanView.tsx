import React from 'react';
import { Button, Subtext, Label, Badge } from '@/components/ui';
import { Lead, LeadStage } from '@/lib/types';
import { User as UserIcon, ChevronRight, Trash2, Zap } from 'lucide-react';

import { KanbanBoard, KanbanItem, KanbanStage } from '@/components/shared/KanbanBoard/KanbanBoard';

// Extend KanbanItem
interface KanbanLead extends Lead, KanbanItem { }

interface Props {
  stages: LeadStage[];
  leadsByStatus: Record<string, Lead[]>;
  onEdit: (lead: Lead) => void;
  onDelete: (id: number, e: React.MouseEvent) => void;
  formatIDR: (num?: number) => string;
  onReorder: (itemId: number, newStatus: string, newIndex?: number) => void;
  hasUrgency?: boolean;
  // Infinite scroll props
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

const getStageColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending': return 'bg-sky-500';
    case 'qualified': return 'bg-emerald-500';
    case 'unqualified': return 'bg-rose-500';
    case 'working': return 'bg-amber-500';
    default: return 'bg-blue-500';
  }
};

export const LeadsKanbanView: React.FC<Props> = ({
  stages, leadsByStatus, onEdit, onDelete, formatIDR, onReorder, hasUrgency,
  hasMore, isLoadingMore, onLoadMore
}) => {

  const kanbanStages: KanbanStage[] = stages.map(s => ({
    id: s.name.toLowerCase(),
    name: s.name,
    colorClass: getStageColor(s.name)
  }));

  const renderCard = (lead: KanbanLead, isDragged: boolean) => (
    <div
      onClick={() => onEdit(lead)}
      className={`group p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-blue-300 transition-all cursor-pointer transform relative ${isDragged ? 'opacity-30' : 'hover:-translate-y-1'
        } ${hasUrgency && lead.is_urgent ? 'border-l-3 border-l-amber-400 bg-amber-50/50 shadow-amber-100/50' : ''}`}
    >
      {hasUrgency && lead.is_urgent && (
        <div className="absolute top-1 left-2">
          <Zap size={10} className="text-amber-500 fill-amber-500 animate-pulse" />
        </div>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => { e.stopPropagation(); onDelete(lead.id, e as any); }}
        className="absolute top-1.5 right-1.5 !p-1.5 text-gray-300 hover:text-red-500 hover:bg-transparent opacity-0 group-hover:opacity-100 transition-all z-10"
      >
        <Trash2 size={12} />
      </Button>
      <div className="flex items-center justify-between mb-1.5 pr-6">
        <div className="flex items-center gap-1.5">
          <Subtext className="text-[9px] text-gray-400 font-medium uppercase">#{String(lead.id).padStart(4, '0')}</Subtext>
          <span className="text-[8px] text-gray-200">•</span>
          <Label className="text-[9px] text-gray-400 font-normal">
            {lead.input_date ? new Date(lead.input_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
          </Label>
        </div>
      </div>

      <div className="mb-2">
        <h4 className="text-[12px] leading-tight text-gray-900 font-medium mb-0.5 line-clamp-2 pr-4">
          {lead.salutation && <span className="text-blue-400 mr-1">{lead.salutation}</span>}
          {lead.name}{' '}
          <span className="text-[10px] text-gray-400 font-normal">
            ({lead.client_company?.name || 'Perorangan'})
          </span>
        </h4>
      </div>

      <div className="flex items-center justify-between mb-2">
        <Subtext className="text-[10px] font-medium text-blue-600">{formatIDR(lead.expected_value)}</Subtext>
        {lead.source && lead.source.trim() !== '' && (
          <Badge variant="primary" className="!px-1.5 !py-0 h-4 flex items-center justify-center !text-[8.5px] uppercase ">
            {lead.source}
          </Badge>
        )}
      </div>

      <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-gray-400 text-[9px]">
        <div className="flex items-center gap-1.5">
          <UserIcon size={10} className="text-gray-300" />
          <span className="truncate max-w-[120px]">{lead.sales_profile?.full_name?.split(' ')[0] || '-'}</span>
        </div>
        <ChevronRight size={12} className="text-gray-300" />
      </div>
    </div>
  );

  const hasMoreByStatus = stages.reduce((acc, stage) => {
    acc[stage.name.toLowerCase()] = !!hasMore;
    return acc;
  }, {} as Record<string, boolean>);

  const isLoadingMoreByStatus = stages.reduce((acc, stage) => {
    acc[stage.name.toLowerCase()] = !!isLoadingMore;
    return acc;
  }, {} as Record<string, boolean>);

  return (
    <KanbanBoard<KanbanLead>
      stages={kanbanStages}
      itemsByStatus={leadsByStatus as Record<string, KanbanLead[]>}
      onReorder={onReorder}
      renderCard={renderCard}
      onLoadMore={onLoadMore}
      hasMoreByStatus={hasMoreByStatus}
      isLoadingMoreByStatus={isLoadingMoreByStatus}
    />
  );
};
