import React from 'react';
import { Button, Subtext, Label } from '@/components/ui';
import { Deal, Pipeline } from '@/lib/types';
import { User as UserIcon, ChevronRight, Trash2, Target, FileText, Plus, FilePlus } from 'lucide-react';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { KanbanBoard, KanbanItem, KanbanStage } from '@/components/shared/KanbanBoard/KanbanBoard';

// Extend KanbanItem
interface KanbanDeal extends Deal, KanbanItem { }

interface Props {
  pipeline: Pipeline | null;
  dealsByStage: Record<string, Deal[]>;
  onEdit: (deal: Deal) => void;
  onDelete: (id: number, e: React.MouseEvent) => void;
  onCreateQuotation?: (clientId: number, dealId: number) => void;
  onEditQuotation?: (quotationId: number) => void;
  formatIDR: (num?: number) => string;
  onReorder: (itemId: number, newStageId: string, newIndex?: number) => void;
}

const getStageColor = (name: string, index: number) => {
  const s = name.toLowerCase();
  // Stronger, more visible header colors
  if (s.includes('qualified') || s.includes('lead') || s.includes('contacted')) return 'bg-sky-500 !text-white border-sky-600';
  if (s.includes('proposal') || s.includes('quotation')) return 'bg-indigo-500 !text-white border-indigo-600';
  if (s.includes('negotiation')) return 'bg-amber-500 !text-white border-amber-600';
  if (s.includes('closing') || s.includes('won')) return 'bg-emerald-500 !text-white border-emerald-600';
  if (s.includes('ghosting') || s.includes('lost')) return 'bg-rose-500 !text-white border-rose-600';

  const fallbackColors = [
    'bg-sky-500 !text-white border-sky-600',
    'bg-indigo-500 !text-white border-indigo-600',
    'bg-amber-500 !text-white border-amber-600',
    'bg-emerald-500 !text-white border-emerald-600',
    'bg-rose-500 !text-white border-rose-600'
  ];
  return fallbackColors[index % fallbackColors.length];
};

export const DealsKanbanView: React.FC<Props> = ({
  pipeline, dealsByStage, onEdit, onDelete,
  onCreateQuotation, onEditQuotation, formatIDR, onReorder
}) => {
  if (!pipeline) return null;

  const kanbanStages: KanbanStage[] = pipeline.stages?.map((stage, sIdx) => ({
    id: stage.id,
    name: stage.name,
    colorClass: getStageColor(stage.name, sIdx)
  })) || [];

  const renderCard = (deal: KanbanDeal, isDragged: boolean) => {
    const quotation: any = Array.isArray(deal.quotations) ? deal.quotations[0] : deal.quotations;

    return (
      <div
        onClick={() => onEdit(deal)}
        className={`group p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-grab active:cursor-grabbing transform hover:-translate-y-1 relative ${isDragged ? 'opacity-30' : ''}`}
      >
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          {quotation ? (
            <ActionButton
              icon={FileText}
              variant="blue"
              onClick={(e) => { e.stopPropagation(); onEditQuotation?.(quotation.id); }}
              title="Edit Penawaran"
              iconSize={12}
              className="!p-1 h-fit"
            />
          ) : (
            onCreateQuotation && deal.client_id && (
              <ActionButton
                icon={FilePlus}
                variant="blue"
                onClick={(e) => { e.stopPropagation(); onCreateQuotation(deal.client_id!, deal.id); }}
                title="Buat Penawaran"
                iconSize={12}
                className="!p-1 h-fit"
              />
            )
          )}

          <ActionButton
            icon={Trash2}
            variant="rose"
            onClick={(e) => { e.stopPropagation(); onDelete(deal.id, e); }}
            title="Hapus Deal"
            iconSize={12}
            className="!p-1 h-fit"
          />
        </div>

        <div className="flex items-center justify-between mb-2 w-3/4">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Subtext className="text-[9px] text-gray-400 uppercase font-medium">#{String(deal.id).padStart(4, '0')}</Subtext>
            <span className="text-[8px] text-gray-200">•</span>
            <Label className="text-[9px] text-gray-400 font-normal">
              {deal.input_date ? new Date(deal.input_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
            </Label>
          </div>
        </div>

        <h4 className="text-[12px] leading-tight text-gray-900 font-medium mb-1 pr-10 !capitalize ! line-clamp-2">{deal.name}</h4>

        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Subtext className="text-[10px] !text-blue-600  font-medium">{formatIDR(deal.expected_value)}</Subtext>
          {(deal.follow_up || 0) > 0 && (
            <Label className="px-1 py-0 bg-amber-50 !text-amber-600 border border-amber-100 rounded text-[7px] font-medium !capitalize ! inline-flex items-center gap-0.5" title={`${deal.follow_up} kali di-follow up`}>
              FU {deal.follow_up}
            </Label>
          )}
          {deal.follow_up_date && (
            <Label className="px-1 py-0 bg-blue-50 !text-blue-600 border border-blue-100 rounded text-[7px] font-medium !capitalize ! inline-flex items-center gap-0.5">
              TGL FU: {new Date(deal.follow_up_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
            </Label>
          )}
        </div>

        {quotation && (
          <div className="mb-2">
            <Label className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 !text-emerald-600 border border-emerald-100 rounded text-[7px] font-medium !capitalize">
              <FileText size={8} /> {quotation.number}
            </Label>
          </div>
        )}

        <div className="mb-3">
          <Subtext className="text-[10px] text-gray-900 !capitalize ! font-medium truncate flex gap-1 items-center">
            {deal.contact_name}
            <span className="text-[10px] text-gray-400 font-normal italic lowercase">({deal.customer_company || 'Perorangan'})</span>
          </Subtext>
        </div>

        <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-gray-400 text-[9px]">
          <div className="flex items-center gap-1.5 font-medium !capitalize !">
            <UserIcon size={10} className="text-gray-300" />
            <span className="truncate max-w-[120px]">{deal.sales_profile?.full_name?.split(' ')[0] || '-'}</span>
          </div>
          <ChevronRight size={10} className="text-gray-300" />
        </div>
      </div>
    );
  };

  // Convert keys to uppercase to match target map standard (if needed, but KanbanBoard will iterate by stages map keys)
  // `dealsByStage` keys are uuid strings. We need to map `status` to `stage_id`.
  // First we need to transform Deals into KanbanItems
  const kanbanItemsByStatus: Record<string, KanbanDeal[]> = {};
  kanbanStages.forEach(stage => {
    kanbanItemsByStatus[stage.id as string] = (dealsByStage[stage.id as string] || []).map(d => ({ ...d, status: d.stage_id }));
  });

  return (
    <KanbanBoard<KanbanDeal>
      stages={kanbanStages}
      itemsByStatus={kanbanItemsByStatus}
      onReorder={onReorder}
      renderCard={renderCard}
    />
  );
};
