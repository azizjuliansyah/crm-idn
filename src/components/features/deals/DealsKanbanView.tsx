import React from 'react';
import { Button, Subtext, Label } from '@/components/ui';

import { Deal, Pipeline } from '@/lib/types';
import { User as UserIcon, ChevronRight, Trash2, Target, FileText, Plus, FilePlus } from 'lucide-react';


interface Props {
  pipeline: Pipeline | null;
  dealsByStage: Record<string, Deal[]>;
  onEdit: (deal: Deal) => void;
  onDelete: (id: number, e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent, id: number) => void;
  onDragOver: (e: React.DragEvent, stageId: string) => void;
  onDrop: (e: React.DragEvent, stageId: string) => void;
  onCreateQuotation?: (clientId: number, dealId: number) => void;
  onEditQuotation?: (quotationId: number) => void;
  dropTarget: string | null;
  formatIDR: (num?: number) => string;
}

const getStageColor = (name: string, index: number) => {
  const s = name.toLowerCase();
  if (s.includes('qualified') || s.includes('lead') || s.includes('contacted')) return 'bg-sky-50 !text-sky-600 border-sky-100';
  if (s.includes('proposal') || s.includes('quotation')) return 'bg-indigo-50 !text-indigo-600 border-indigo-100';
  if (s.includes('negotiation')) return 'bg-amber-50 !text-amber-600 border-amber-100';
  if (s.includes('closing') || s.includes('won')) return 'bg-emerald-50 !text-emerald-600 border-emerald-100';
  if (s.includes('ghosting') || s.includes('lost')) return 'bg-rose-50 !text-rose-600 border-rose-100';

  // Fallback to index if no keywords match
  const fallbackColors = [
    'bg-sky-50 !text-sky-600 border-sky-100',
    'bg-indigo-50 !text-indigo-600 border-indigo-100',
    'bg-amber-50 !text-amber-600 border-amber-100',
    'bg-emerald-50 !text-emerald-600 border-emerald-100',
    'bg-rose-50 !text-rose-600 border-rose-100'
  ];
  return fallbackColors[index % fallbackColors.length];
};

export const DealsKanbanView: React.FC<Props> = ({
  pipeline, dealsByStage, onEdit, onDelete,
  onDragStart, onDragOver, onDrop, onCreateQuotation, onEditQuotation, dropTarget, formatIDR
}) => {
  if (!pipeline) return null;

  return (
    <div className="flex gap-4 items-start h-full overflow-x-auto pb-4 custom-scrollbar">
      {pipeline.stages?.map((stage, sIdx) => (
        <div key={stage.id} className="flex flex-col gap-3 min-w-[280px] w-[280px] h-full">
          <div className={`p-4 ${getStageColor(stage.name, sIdx)} border rounded-xl shadow-sm flex items-center justify-between`}>
            <Label className="text-[10px] !capitalize !tracking-tight font-medium">{stage.name}</Label>
            <Label className="text-[10px] bg-white/50 px-2.5 py-0.5 rounded-full">{dealsByStage[stage.id]?.length || 0}</Label>
          </div>
          <div
            onDragOver={(e) => onDragOver(e, stage.id)}
            onDrop={(e) => onDrop(e, stage.id)}
            className={`flex-1 space-y-3 p-2 rounded-2xl border-2 border-dashed transition-all overflow-y-auto custom-scrollbar ${dropTarget === stage.id ? 'bg-blue-50/50 border-blue-300' : 'bg-gray-50/50 border-gray-100'}`}
          >
            {dealsByStage[stage.id]?.map(deal => {
              // Robust handling for 1:1 relation where quotations can be an object or an array
              const quotation: any = Array.isArray(deal.quotations) ? deal.quotations[0] : deal.quotations;

              return (
                <div
                  key={deal.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, deal.id)}
                  onClick={() => onEdit(deal)}
                  className="group p-5 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-grab active:cursor-grabbing transform hover:-translate-y-1 relative"
                >
                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    {quotation ? (
                      <Button
                        onClick={(e) => { e.stopPropagation(); onEditQuotation?.(quotation.id); }}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                        title="Edit Penawaran"
                      >
                        <FileText size={12} />
                      </Button>
                    ) : (
                      onCreateQuotation && deal.client_id && (
                        <Button
                          onClick={(e) => { e.stopPropagation(); onCreateQuotation(deal.client_id!, deal.id); }}
                          className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg"
                          title="Buat Penawaran"
                        >
                          <FilePlus size={12} />
                        </Button>
                      )
                    )}

                    <Button
                      onClick={(e) => onDelete(deal.id, e)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between mb-3 w-3/4">
                    <div className="flex flex-col gap-0.5">
                      <Subtext className="text-[9px]  text-gray-300 uppercase">#{String(deal.id).padStart(4, '0')}</Subtext>
                      <Label className="text-[9px]  text-gray-400">
                        {deal.input_date ? new Date(deal.input_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </Label>
                    </div>
                  </div>

                  <h4 className="text-[13px] text-gray-900 mb-1 group-hover:text-blue-600 transition-colors leading-tight pr-10 !capitalize !tracking-tight">{deal.name}</h4>
                  <div className="flex items-center gap-2 mb-1">
                    <Subtext className="text-[10px] !text-blue-600 tracking-tight font-medium">{formatIDR(deal.expected_value)}</Subtext>
                    {(deal.follow_up || 0) > 0 && (
                      <Label className="px-1.5 py-0.5 bg-amber-50 !text-amber-600 border border-amber-100 rounded text-[8px] font-medium !capitalize !tracking-tight inline-flex items-center gap-1" title={`${deal.follow_up} kali di-follow up`}>
                        FU {deal.follow_up}
                      </Label>
                    )}
                    {deal.follow_up_date && (
                      <Label className="px-1.5 py-0.5 bg-blue-50 !text-blue-600 border border-blue-100 rounded text-[8px] font-medium !capitalize !tracking-tight inline-flex items-center gap-1">
                        TGL FU: {new Date(deal.follow_up_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </Label>
                    )}
                  </div>

                  {quotation && (
                    <div className="mb-3">
                      <Label className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 !text-emerald-600 border border-emerald-100 rounded text-[8px] font-medium !capitalize">
                        <FileText size={8} /> {quotation.number}
                      </Label>
                    </div>
                  )}

                  <div className="space-y-0.5 mb-4">
                    <Subtext className="text-[10px] text-gray-900 !capitalize !tracking-tight font-medium">{deal.contact_name}</Subtext>
                    <Subtext className="text-[9px] text-gray-400 font-medium italic truncate !capitalize !tracking-tight">{deal.customer_company || 'Perorangan'}</Subtext>
                  </div>

                  <div className="pt-3 border-t border-gray-50 flex items-center justify-between text-gray-400 text-[9px] ">
                    <div className="flex items-center gap-1.5 font-medium !capitalize !tracking-tight">
                      <UserIcon size={10} />
                      {deal.sales_profile?.full_name?.split(' ')[0] || '-'}
                    </div>
                    <ChevronRight size={12} />
                  </div>
                </div>
              );
            })}
            {dealsByStage[stage.id]?.length === 0 && (
              <div className="py-12 text-center opacity-10">
                <Target size={32} className="mx-auto mb-2" />
                <Subtext className="text-[9px]  uppercase tracking-tight text-gray-400">Tahapan Kosong</Subtext>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
