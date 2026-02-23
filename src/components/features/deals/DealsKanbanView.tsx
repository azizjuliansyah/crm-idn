
import React from 'react';
import { Deal, Pipeline } from '@/lib/types';
import { User as UserIcon, ChevronRight, Trash2, Target, FileText, Plus } from 'lucide-react';

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

const STAGE_COLOR_VARIANTS = [
  'bg-blue-600',
  'bg-indigo-600',
  'bg-violet-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-orange-600',
  'bg-rose-600',
];

export const DealsKanbanView: React.FC<Props> = ({ 
  pipeline, dealsByStage, onEdit, onDelete, 
  onDragStart, onDragOver, onDrop, onCreateQuotation, onEditQuotation, dropTarget, formatIDR 
}) => {
  if (!pipeline) return null;

  return (
    <div className="flex gap-4 items-start h-full overflow-x-auto pb-4 custom-scrollbar">
      {pipeline.stages?.map((stage, sIdx) => (
        <div key={stage.id} className="flex flex-col gap-3 min-w-[280px] w-[280px] h-full">
          <div className={`p-4 ${STAGE_COLOR_VARIANTS[sIdx % STAGE_COLOR_VARIANTS.length]} rounded-xl shadow-md flex items-center justify-between`}>
             <span className="text-[10px] font-bold uppercase tracking-widest text-white">{stage.name}</span>
             <span className="text-[10px] font-bold text-white bg-white/20 px-2.5 py-0.5 rounded-full">{dealsByStage[stage.id]?.length || 0}</span>
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
                        <button 
                          onClick={(e) => { e.stopPropagation(); onEditQuotation?.(quotation.id); }} 
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          title="Edit Penawaran"
                        >
                          <FileText size={12} />
                        </button>
                      ) : (
                        onCreateQuotation && deal.client_id && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); onCreateQuotation(deal.client_id!, deal.id); }} 
                            className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg"
                            title="Buat Penawaran"
                          >
                            <Plus size={12} />
                          </button>
                        )
                      )}
                      
                      <button 
                        onClick={(e) => onDelete(deal.id, e)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      >
                         <Trash2 size={12} />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[9px] font-bold text-gray-300 uppercase">#{String(deal.id).padStart(4, '0')}</p>
                    </div>
                    
                    <h4 className="font-bold text-[13px] text-gray-900 mb-1 group-hover:text-blue-600 transition-colors leading-tight pr-10">{deal.name}</h4>
                    <p className="text-[10px] text-blue-600 font-bold mb-1">{formatIDR(deal.expected_value)}</p>
                    
                    {quotation && (
                      <div className="mb-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded text-[8px] font-bold uppercase tracking-widest">
                          <FileText size={8} /> {quotation.number}
                        </span>
                      </div>
                    )}

                    <div className="space-y-0.5 mb-4">
                      <p className="text-[10px] text-gray-900 font-bold">{deal.contact_name}</p>
                      <p className="text-[9px] text-gray-400 font-medium italic truncate">{deal.customer_company || 'Perorangan'}</p>
                    </div>
                    
                    <div className="pt-3 border-t border-gray-50 flex items-center justify-between text-gray-400 text-[9px] font-bold">
                      <div className="flex items-center gap-1.5">
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
                   <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Tahapan Kosong</p>
                </div>
             )}
          </div>
        </div>
      ))}
    </div>
  );
};
