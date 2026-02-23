import React from 'react';
import { SupportTicket, SupportStage } from '@/lib/types';
import { ChevronRight, Trash2, LifeBuoy } from 'lucide-react';
import { Badge, Button } from '@/components/ui';

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

const COLORS = ['bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-blue-500', 'bg-indigo-500'];

export const SupportTicketsKanbanView: React.FC<Props> = ({ 
  stages, ticketsByStatus, onEdit, onDelete, onDragStart, onDragOver, onDrop, dropTarget 
}) => {
  return (
    <div className="flex gap-4 items-start h-full overflow-x-auto pb-4 custom-scrollbar">
      {stages.map((stage, idx) => {
        const sKey = stage.name.toLowerCase();
        return (
          <div key={stage.id} onDragOver={(e) => onDragOver(e, sKey)} onDrop={(e) => onDrop(e, sKey)} className="flex flex-col gap-3 min-w-[280px] w-[280px] h-full group/column">
            <div className={`p-4 ${COLORS[idx % COLORS.length]} rounded-2xl shadow-lg shadow-gray-200/50 flex items-center justify-between text-white transition-all`}>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{stage.name}</span>
              <span className="text-[10px] font-bold bg-white/20 px-2.5 py-0.5 rounded-full ring-1 ring-white/30">{ticketsByStatus[sKey]?.length || 0}</span>
            </div>
            <div className={`flex-1 space-y-3 p-2 rounded-2xl border-2 border-dashed transition-all overflow-y-auto custom-scrollbar ${dropTarget === sKey ? 'bg-rose-50 border-rose-300' : 'bg-gray-50/50 border-gray-100'}`}>
              {ticketsByStatus[sKey]?.map(t => (
                <div 
                  key={t.id} 
                  draggable 
                  onDragStart={(e) => onDragStart(e, t.id)} 
                  onClick={() => onEdit(t)} 
                  className="group p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-gray-200/50 hover:border-rose-300 transition-all cursor-pointer transform hover:-translate-y-1 relative"
                >
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => onDelete(t.id, e!)} 
                    className="absolute top-3 right-3 !p-1.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all shadow-none border-none rounded-lg"
                  >
                    <Trash2 size={12} />
                  </Button>
                  <div className="flex items-center justify-between mb-3">
                     <p className="text-[9px] font-extrabold text-gray-400 font-mono tracking-tighter">#{String(t.id).padStart(4, '0')}</p>
                     <div className="flex items-center gap-1.5">
                        <Badge variant={t.type === 'complaint' ? 'danger' : 'primary'} className="text-[7px] py-0.5 px-2 border-none ring-1 ring-inset tracking-widest uppercase">
                          {t.type || 'ticket'}
                        </Badge>
                     </div>
                  </div>
                  <h4 className="font-bold text-[13px] text-gray-900 mb-1 leading-tight group-hover:text-rose-600 transition-colors pr-6 uppercase tracking-tight">{t.title}</h4>
                  <div className="flex items-center gap-2 mb-4">
                    <p className="text-[10px] text-gray-400 font-bold uppercase italic truncate flex-1">{t.client?.name || 'Umum'}</p>
                    <Badge variant={t.priority === 'urgent' ? 'danger' : 'secondary'} className="text-[7px] py-0.5 px-2 font-black uppercase">
                      {t.priority}
                    </Badge>
                  </div>
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-gray-400 text-[9px] font-bold">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center text-[8px] font-bold shadow-sm uppercase">
                        {t.assigned_profile?.full_name?.charAt(0) || '?'}
                      </div>
                      <span className="tracking-tight text-gray-500">{t.assigned_profile?.full_name?.split(' ')[0]}</span>
                    </div>
                    <ChevronRight size={12} className="text-gray-300 group-hover:text-rose-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))}
              {ticketsByStatus[sKey]?.length === 0 && (
                <div className="py-12 text-center opacity-10 flex flex-col items-center grayscale">
                  <LifeBuoy size={32} className="mb-2 animate-spin-slow" />
                  <span className="text-[8px] font-bold uppercase tracking-widest">Kosong</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
