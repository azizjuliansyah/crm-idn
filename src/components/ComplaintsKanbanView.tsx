import React from 'react';
import { SupportTicket, SupportStage } from '@/lib/types';
import { ChevronRight, Trash2, ShieldAlert } from 'lucide-react';

interface Props {
  stages: SupportStage[];
  ticketsByStatus: Record<string, SupportTicket[]>;
  onEdit: (t: SupportTicket) => void;
  onDelete: (id: number, e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent, id: number) => void;
  onDragOver: (e: React.DragEvent, stageName: string) => void;
  onDrop: (e: React.DragEvent, stageName: string) => void;
  dropTarget: string | null;
}

const COLORS = ['bg-rose-600', 'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-gray-500'];

export const ComplaintsKanbanView: React.FC<Props> = ({ 
  stages, ticketsByStatus, onEdit, onDelete, onDragStart, onDragOver, onDrop, dropTarget 
}) => {
  return (
    <div className="flex gap-4 items-start h-full overflow-x-auto pb-4 custom-scrollbar">
      {stages.map((stage, idx) => {
        const sKey = stage.name.toLowerCase();
        return (
          <div key={stage.id} onDragOver={(e) => onDragOver(e, sKey)} onDrop={(e) => onDrop(e, sKey)} className="flex flex-col gap-3 min-w-[300px] w-[300px] h-full">
            <div className={`p-4 ${COLORS[idx % COLORS.length]} rounded-xl shadow-md flex items-center justify-between text-white`}>
              <span className="text-[10px] font-bold uppercase tracking-widest">{stage.name}</span>
              <span className="text-[10px] font-bold bg-white/20 px-2.5 py-0.5 rounded-full">{ticketsByStatus[sKey]?.length || 0}</span>
            </div>
            <div className={`flex-1 space-y-3 p-2 rounded-2xl border-2 border-dashed transition-all overflow-y-auto custom-scrollbar ${dropTarget === sKey ? 'bg-rose-50 border-rose-300' : 'bg-gray-50/50 border-transparent'}`}>
              {ticketsByStatus[sKey]?.map(t => (
                <div key={t.id} draggable onDragStart={(e) => onDragStart(e, t.id)} onClick={() => onEdit(t)} className="group p-5 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-rose-300 transition-all cursor-grab active:cursor-grabbing transform hover:-translate-y-1 relative">
                  <button onClick={(e) => onDelete(t.id, e)} className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12} /></button>
                  <div className="flex items-center justify-between mb-3">
                     <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">#{String(t.id).padStart(4, '0')}</p>
                     <div className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${t.priority === 'urgent' ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-400'}`}>{t.priority}</div>
                  </div>
                  <h4 className="font-bold text-[13px] text-gray-900 mb-1 leading-tight group-hover:text-rose-600 transition-colors pr-6 uppercase tracking-tight">{t.title}</h4>
                  <p className="text-[10px] text-gray-400 font-bold mb-4 italic truncate">{t.client?.name || 'Client Umum'}</p>
                  <div className="pt-3 border-t border-gray-50 flex items-center justify-between text-gray-400 text-[9px] font-bold">
                    <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 text-[8px] font-bold uppercase">{t.assigned_profile?.full_name?.charAt(0)}</div>{t.assigned_profile?.full_name?.split(' ')[0] || 'Unassigned'}</div>
                    <ChevronRight size={12} />
                  </div>
                </div>
              ))}
              {ticketsByStatus[sKey]?.length === 0 && (
                 <div className="py-12 text-center opacity-5">
                    <ShieldAlert size={48} className="mx-auto" />
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] mt-2">No Complaints</p>
                 </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
