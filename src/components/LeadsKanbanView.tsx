
import React from 'react';
import { Lead, LeadStage } from '@/lib/types';
import { User as UserIcon, ChevronRight, Trash2 } from 'lucide-react';

interface Props {
  stages: LeadStage[];
  leadsByStatus: Record<string, Lead[]>;
  onEdit: (lead: Lead) => void;
  onDelete: (id: number, e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent, id: number) => void;
  onDragOver: (e: React.DragEvent, stageName: string) => void;
  onDrop: (e: React.DragEvent, stageName: string) => void;
  dropTarget: string | null;
  formatIDR: (num?: number) => string;
}

const STAGE_COLOR_VARIANTS = [
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-orange-500',
  'bg-rose-500',
];

export const LeadsKanbanView: React.FC<Props> = ({ 
  stages, leadsByStatus, onEdit, onDelete, onDragStart, 
  onDragOver, onDrop, dropTarget, formatIDR 
}) => {
  return (
    <div className="flex gap-4 items-start h-full overflow-x-auto pb-4 custom-scrollbar">
      {stages.map((stage, sIdx) => {
        const sKey = stage.name.toLowerCase();
        return (
          <div key={stage.id} onDragOver={(e) => onDragOver(e, sKey)} onDrop={(e) => onDrop(e, sKey)} className="flex flex-col gap-3 min-w-[260px] w-[260px] h-full">
            <div className={`p-4 ${STAGE_COLOR_VARIANTS[sIdx % STAGE_COLOR_VARIANTS.length]} rounded-xl shadow-md flex items-center justify-between`}>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white">{stage.name}</span>
              <span className="text-[10px] text-white font-bold bg-white/20 px-2.5 py-0.5 rounded-full">{leadsByStatus[sKey]?.length || 0}</span>
            </div>
            <div className={`flex-1 space-y-3 p-2 rounded-2xl border-2 border-dashed transition-all overflow-y-auto custom-scrollbar ${dropTarget === sKey ? 'bg-blue-50/50 border-blue-300' : 'bg-gray-50/50 border-gray-200'}`}>
              {leadsByStatus[sKey]?.map(lead => (
                <div key={lead.id} draggable onDragStart={(e) => onDragStart(e, lead.id)} onClick={() => onEdit(lead)} className="group p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-blue-300 transition-all cursor-grab active:cursor-grabbing transform hover:-translate-y-1 relative">
                  <button 
                    onClick={(e) => onDelete(lead.id, e)}
                    className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                     <Trash2 size={12} />
                  </button>
                  <div className="flex items-center justify-between mb-2">
                     <p className="text-[9px] font-bold text-gray-300 uppercase">#{String(lead.id).padStart(4, '0')}</p>
                     <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-50 rounded-md text-blue-500 text-[8px] font-bold uppercase">{lead.source}</div>
                  </div>
                  <h4 className="font-bold text-[13px] text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{lead.salutation && <span className="text-blue-400 font-bold mr-1">{lead.salutation}</span>}{lead.name}</h4>
                  <p className="text-[10px] text-blue-600 font-bold mb-1">{formatIDR(lead.expected_value)}</p>
                  <p className="text-[10px] text-gray-400 font-bold truncate mb-3">{lead.client_company?.name || 'Perorangan'}</p>
                  <div className="pt-3 border-t border-gray-50 flex items-center justify-between text-gray-400 text-[9px] font-bold"><div className="flex items-center gap-1.5"><UserIcon size={10} />{lead.sales_profile?.full_name.split(' ')[0] || '-'}</div><ChevronRight size={12} /></div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
