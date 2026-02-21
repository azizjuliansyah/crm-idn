import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { SupportTicket, Profile, Company, CompanyMember, SupportStage, Client, LeadActivity } from '@/lib/types';
import { 
  ChevronLeft, Headset, Trash2, Loader2, Save, X, 
  ArrowUp, MessageSquare, RefreshCw, Layers,
  Clock, ShieldAlert
} from 'lucide-react';
import { Modal } from '@/components/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ticket: SupportTicket;
  company: Company;
  user: Profile;
  members: CompanyMember[];
  stages: SupportStage[];
  clients: Client[];
  onUpdate: () => void;
  onDelete: (id: number) => void;
}

export const SupportTicketDetailModal: React.FC<Props> = ({ 
  isOpen, onClose, ticket, company, user, members, stages, clients, onUpdate, onDelete 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [form, setForm] = useState<Partial<SupportTicket>>(ticket);

  const fetchActivities = useCallback(async () => {
    if (!ticket?.id) return;
    setLoadingActivities(true);
    try {
      const { data } = await supabase.from('lead_activities').select('*, profiles(*)').eq('ticket_id', ticket.id).order('created_at', { ascending: false });
      if (data) setActivities(data as any);
    } finally {
      setLoadingActivities(false);
    }
  }, [ticket?.id]);

  useEffect(() => {
    if (isOpen && ticket) {
      setForm(ticket);
      fetchActivities();
    }
  }, [isOpen, ticket, fetchActivities]);

  const handleStatusChange = async (newStatus: string) => {
    if (isProcessing || newStatus.toLowerCase() === form.status?.toLowerCase()) return;
    setIsProcessing(true);
    try {
      const oldStatus = ticket.status;
      const { error } = await supabase.from('support_tickets').update({ status: newStatus.toLowerCase() }).eq('id', ticket.id);
      if (error) throw error;
      
      await supabase.from('lead_activities').insert({
        ticket_id: ticket.id,
        user_id: user.id,
        content: `Status diubah dari ${oldStatus} ke ${newStatus.toLowerCase()}`,
        activity_type: 'status_change'
      });

      setForm(prev => ({ ...prev, status: newStatus.toLowerCase() }));
      onUpdate();
      await fetchActivities();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || isProcessing) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('lead_activities').insert({
        ticket_id: ticket.id,
        user_id: user.id,
        content: newComment,
        activity_type: 'comment'
      });
      if (error) throw error;
      setNewComment('');
      await fetchActivities();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('support_tickets').update({
        title: form.title,
        description: form.description,
        client_id: form.client_id,
        assigned_id: form.assigned_id,
        priority: form.priority,
        status: form.status,
        type: form.type
      }).eq('id', ticket.id);
      if (error) throw error;
      onUpdate();
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="xl" hideClose noPadding noScroll>
      <div className="flex flex-col h-[88vh] bg-white text-[#111827] overflow-hidden rounded-md border border-gray-200">
        <header className="px-6 h-16 flex items-center justify-between border-b border-gray-100 bg-white shrink-0">
           <div className="flex items-center gap-4">
              <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-100 rounded transition-all"><ChevronLeft size={20} /></button>
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded bg-rose-600 text-white flex items-center justify-center"><Headset size={18} /></div>
                 <h2 className="text-base font-bold tracking-tight text-gray-900">{form.title}</h2>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <button onClick={() => onDelete(ticket.id)} className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"><Trash2 size={18} /></button>
              <button onClick={handleSave} disabled={isProcessing} className="h-10 px-6 bg-gray-900 text-white rounded font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-black transition-all">
                 {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} UPDATE TICKET
              </button>
              <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-900 ml-2"><X size={20} /></button>
           </div>
        </header>

        <div className="px-8 py-4 flex items-center justify-between border-b border-gray-50 bg-gray-50/30 shrink-0">
           <div className="flex items-center gap-6">
              <div className="px-2 py-0.5 border border-gray-200 rounded-sm text-[10px] font-bold text-gray-500 bg-white uppercase">Ticket ID: {ticket.id}</div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400"><Clock size={14} /> Dibuat {new Date(ticket.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-rose-100 bg-rose-50 text-[9px] font-bold text-rose-600 uppercase tracking-widest">
                <Layers size={10} /> {form.type === 'complaint' ? 'COMPLAINT' : 'STANDARD TICKET'}
              </div>
           </div>
           <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Prioritas:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${form.priority === 'urgent' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>{form.priority}</span>
           </div>
        </div>

        <div className="px-8 pt-6 pb-2 shrink-0">
           <div className="flex items-center h-10 w-full overflow-hidden rounded-sm border border-gray-200">
              {stages.map((stage, idx) => {
                const isActive = form.status?.toLowerCase() === stage.name.toLowerCase();
                const isLast = idx === stages.length - 1;
                const isFirst = idx === 0;
                let bgColor = 'bg-white text-gray-400 hover:bg-gray-50';
                if (isActive) bgColor = 'bg-rose-600 text-white';
                return (
                  <button key={stage.id} onClick={() => handleStatusChange(stage.name)} className={`relative flex-1 h-full flex items-center justify-center transition-all text-[10px] font-bold uppercase tracking-widest ${bgColor} border-r last:border-r-0`}
                    style={{ clipPath: isLast ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 3% 50%)' : isFirst ? 'polygon(0% 0%, 97% 0%, 100% 50%, 97% 100%, 0% 100%)' : 'polygon(0% 0%, 97% 0%, 100% 50%, 97% 100%, 0% 100%, 3% 50%)' }}>
                    {stage.name}
                  </button>
                );
              })}
           </div>
        </div>

        <div className="flex-1 flex overflow-hidden px-8 py-6 gap-10">
          <div className="w-1/2 flex flex-col border-r border-gray-100 pr-10">
             <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-6">Log Percakapan & Status</h3>
             <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-start gap-4 mb-8">
                   <div className="w-9 h-9 rounded bg-rose-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">{user.full_name.charAt(0)}</div>
                   <div className="flex-1 relative">
                      <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Tulis update penyelesaian..." className="w-full min-h-[80px] bg-gray-50 border border-gray-200 rounded-sm p-3 text-xs font-medium outline-none focus:bg-white focus:border-rose-400 transition-all resize-none" />
                      <div className="absolute right-2 bottom-2"><button onClick={handleAddComment} disabled={!newComment.trim()} className="p-1.5 bg-gray-900 text-white rounded hover:bg-black transition-all disabled:opacity-20"><ArrowUp size={16} /></button></div>
                   </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-6">
                   {loadingActivities ? <div className="py-20 text-center animate-pulse">Memuat...</div> : activities.length === 0 ? <div className="py-20 text-center text-gray-300 italic text-[10px] uppercase tracking-widest">Belum ada log</div> : activities.map((act, i) => (
                      <div key={act.id} className="relative flex gap-6">
                         {i < activities.length - 1 && <div className="absolute left-[17.5px] top-6 bottom-[-24px] w-px bg-gray-100"></div>}
                         <div className="shrink-0"><div className="w-9 h-9 rounded border border-gray-200 bg-white flex items-center justify-center text-gray-400">{act.activity_type === 'status_change' ? <RefreshCw size={14} className="text-blue-500" /> : <MessageSquare size={14} />}</div></div>
                         <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1"><span className="text-xs font-bold text-gray-900">{act.profiles?.full_name}</span><span className="text-[9px] font-bold text-gray-300 uppercase">{new Date(act.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span></div>
                            <p className={`text-[12px] font-medium leading-relaxed ${act.activity_type === 'status_change' ? 'text-gray-400 italic' : 'text-gray-600'}`}>{act.content}</p>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>

          <div className="w-1/2 flex flex-col space-y-6 overflow-y-auto custom-scrollbar pr-2">
             <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Formulir Bantuan</h3>
             <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-0.5">Klasifikasi Tipe</label>
                  <select 
                    value={form.type} 
                    onChange={e => setForm({...form, type: e.target.value as any})} 
                    className="w-full h-11 bg-gray-50 border border-gray-100 rounded-sm px-3 text-xs font-bold outline-none focus:bg-white focus:border-rose-400 transition-all cursor-pointer shadow-inner"
                  >
                    <option value="ticket">Standard Ticket (Support)</option>
                    <option value="complaint">Complaint (Keluhan)</option>
                  </select>
                </div>
                <div className="space-y-1.5"><label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-0.5">Judul Ticket</label><input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full h-11 bg-gray-50 border border-gray-100 rounded-sm px-4 text-xs font-bold outline-none focus:bg-white focus:border-rose-400 transition-all shadow-inner" /></div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5"><label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-0.5">Client Terkait</label><select value={form.client_id || ''} onChange={e => setForm({...form, client_id: Number(e.target.value)})} className="w-full h-11 bg-gray-50 border border-gray-100 rounded-sm px-3 text-xs font-bold outline-none focus:bg-white focus:border-rose-400 transition-all cursor-pointer">{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                   <div className="space-y-1.5"><label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-0.5">Assigned Tim</label><select value={form.assigned_id || ''} onChange={e => setForm({...form, assigned_id: e.target.value})} className="w-full h-11 bg-gray-50 border border-gray-100 rounded-sm px-3 text-xs font-bold outline-none focus:bg-white focus:border-rose-400 transition-all cursor-pointer">{members.map(m => m.profiles && <option key={m.profiles.id} value={m.profiles.id}>{m.profiles.full_name}</option>)}</select></div>
                </div>
                <div className="space-y-1.5"><label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-0.5">Deskripsi Kendala</label><textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} className="w-full min-h-[140px] bg-gray-50 border border-gray-100 rounded-sm p-4 text-xs font-medium outline-none focus:bg-white focus:border-rose-400 transition-all resize-none shadow-inner" /></div>
             </div>
          </div>
        </div>
      </div>
      <style>{` .custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #eee; border-radius: 10px; } `}</style>
    </Modal>
  );
};
