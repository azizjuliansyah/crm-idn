import React, { useState, useEffect, useCallback } from 'react';
import { Input, Select, Textarea, Button, H2, H3, Subtext, Label, Modal, Badge, Timeline, TimelineItem, TimelineIcon, TimelineContent } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { SupportTicket, Profile, Company, CompanyMember, SupportStage, Client, LeadActivity, TicketTopic } from '@/lib/types';
import {
  ChevronLeft, Headset, Trash2, Loader2, Save, X,
  ArrowUp, MessageSquare, RefreshCw, Layers,
  Clock, ShieldAlert
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ticket: SupportTicket;
  company: Company;
  user: Profile;
  members: CompanyMember[];
  stages: SupportStage[];
  clients: Client[];
  topics: TicketTopic[];
  onUpdate: () => void;
  onDelete: (id: number) => void;
}

export const SupportTicketDetailModal: React.FC<Props> = ({
  isOpen, onClose, ticket, company, user, members, stages, clients, topics, onUpdate, onDelete
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
      const { data } = await supabase.from('lead_activities').select('*, profile:profiles(*)').eq('ticket_id', ticket.id).order('created_at', { ascending: false });
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
        topic_id: form.topic_id,
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
      <div className="flex flex-col h-[90vh] bg-white text-gray-900 overflow-hidden rounded-2xl border border-gray-100 shadow-2xl">
        <header className="px-6 h-16 flex items-center justify-between border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onClose} className="!p-1.5 text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-900 transition-all rounded-xl"><ChevronLeft size={20} /></Button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-100 group">
                <Headset size={18} className="group-hover:rotate-12 transition-transform" />
              </div>
              <H2 className="text-base tracking-tight  uppercase">{form.title}</H2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => onDelete(ticket.id)} className="!p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border-none shadow-none"><Trash2 size={18} /></Button>
            <Button onClick={handleSave} disabled={isProcessing} isLoading={isProcessing} leftIcon={<Save size={14} />} variant="danger" className="h-10 px-6  text-xs uppercase tracking-[0.1em] shadow-lg shadow-rose-100">
              UPDATE TICKET
            </Button>
            <Button variant="ghost" onClick={onClose} className="!p-1.5 text-gray-400 ml-2 hover:text-gray-900 rounded-xl"><X size={20} /></Button>
          </div>
        </header>

        <div className="px-8 py-4 flex items-center justify-between border-b border-gray-100 bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-6">
            <Badge variant="ghost" className="px-2.5 py-1 border border-gray-200 text-[9px]  text-gray-600 bg-white uppercase tracking-tight ring-1 ring-inset ring-gray-100">ID TICKET: {ticket.id}</Badge>
            <div className="flex items-center gap-1.5 text-[10px]  text-gray-400 uppercase tracking-tight"><Clock size={14} className="text-gray-300" /> Dibuat {new Date(ticket.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            <Badge variant={form.type === 'complaint' ? 'danger' : 'primary'} className="flex items-center gap-1.5 px-3 py-1 text-[9px]  uppercase tracking-[0.2em] border-none ring-1 ring-inset shadow-sm">
              <Layers size={10} /> {form.type === 'complaint' ? 'COMPLAINT' : 'STANDARD TICKET'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[10px]  text-gray-400 uppercase tracking-tight">Urgensi:</Label>
            <Badge variant={form.priority === 'urgent' ? 'danger' : 'secondary'} className="text-[10px] py-1 px-3  uppercase tracking-tight ring-1 ring-inset">{form.priority}</Badge>
          </div>
        </div>

        <div className="px-8 pt-6 pb-2 shrink-0">
          <div className="flex items-center h-11 w-full overflow-hidden rounded-xl border border-gray-200 p-1 bg-gray-50/50">
            {stages.map((stage, idx) => {
              const isActive = form.status?.toLowerCase() === stage.name.toLowerCase();
              let bgColor = 'bg-transparent text-gray-400 hover:text-gray-600';
              if (isActive) bgColor = 'bg-white text-rose-600 shadow-sm ring-1 ring-gray-100';
              return (
                <Button key={stage.id} onClick={() => handleStatusChange(stage.name)} className={`relative flex-1 h-full flex items-center justify-center transition-all text-[9px]  uppercase tracking-[0.15em] rounded-lg ${bgColor}`}>
                  {stage.name}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden px-8 py-6 gap-10">
          <div className="w-1/2 flex flex-col border-r border-gray-100 pr-10">
            <H3 className="text-[10px]  text-gray-400 uppercase tracking-[0.25em] mb-6 flex items-center gap-2"><MessageSquare size={12} className="text-gray-300" /> Log Percakapan & Status</H3>
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-start gap-4 mb-8">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center  text-[12px] shrink-0 uppercase shadow-lg shadow-rose-100">{user.full_name?.charAt(0)}</div>
                <div className="flex-1 relative">
                  <Textarea
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Tulis update penyelesaian di sini..."
                    className="min-h-[90px] rounded-2xl border-gray-100 focus:border-rose-400 focus:ring-rose-400/10 transition-all text-xs font-medium placeholder:text-gray-300"
                  />
                  <div className="absolute right-2.5 bottom-2.5">
                    <Button
                      variant="danger"
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="!p-2 !h-auto rounded-xl shadow-lg shadow-rose-100 hover:-translate-y-0.5 transition-all"
                    >
                      <ArrowUp size={16} />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-hide pr-2">
                <Timeline>
                  {loadingActivities ? (
                    <div className="py-20 flex flex-col items-center gap-3">
                      <Loader2 className="animate-spin text-rose-600/20" size={24} />
                      <Label className="text-[9px]  uppercase text-gray-300 tracking-[0.2em]">Memuat Log...</Label>
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="py-20 text-center text-gray-200 italic text-[9px]  uppercase tracking-[0.3em]">Belum Ada Aktivitas</div>
                  ) : activities.map((act) => (
                    <TimelineItem key={act.id} className="pb-8">
                      <TimelineIcon>
                        <div className={`w-full h-full rounded-lg bg-white flex items-center justify-center shadow-sm border ${act.activity_type === 'status_change' ? 'border-blue-50 text-blue-500' : 'border-gray-50 text-gray-400'}`}>
                          {act.activity_type === 'status_change' ? <RefreshCw size={12} /> : <MessageSquare size={12} />}
                        </div>
                      </TimelineIcon>
                      <TimelineContent>
                        <div className="flex items-center gap-3 mb-1.5">
                          <Label className="text-[11px]  text-gray-900 tracking-tight">{act.profile?.full_name}</Label>
                          <Label className="text-[8px]  text-gray-300 uppercase tracking-tight bg-gray-50 px-1.5 py-0.5 rounded">{new Date(act.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • {new Date(act.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}</Label>
                        </div>
                        <Subtext className={`text-[12px] font-medium leading-relaxed ${act.activity_type === 'status_change' ? 'text-gray-400 italic ' : 'text-gray-600'}`}>{act.content}</Subtext>
                      </TimelineContent>
                    </TimelineItem>
                  ))}
                </Timeline>
              </div>
            </div>
          </div>

          <div className="w-1/2 flex flex-col space-y-8 overflow-y-auto scrollbar-hide pr-2">
            <H3 className="text-[10px]  text-gray-400 uppercase tracking-[0.25em] flex items-center gap-2"><Layers size={12} className="text-gray-300" /> Konfigurasi Data Tiket</H3>
            <div className="space-y-6">
              <Select
                label="Klasifikasi Masalah"
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value as any })}
                className="rounded-xl"
              >
                <option value="ticket">Standard Ticket (Support)</option>
                <option value="complaint">Complaint (Keluhan)</option>
              </Select>

              <Input label="Subjek / Judul Tiket" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="rounded-xl" />

              <div className="grid grid-cols-2 gap-4">
                <Select label="Client Pelapor" value={form.client_id || ''} onChange={e => setForm({ ...form, client_id: Number(e.target.value) })} className="rounded-xl">
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                <Select label="PIC Tim Support" value={form.assigned_id || ''} onChange={e => setForm({ ...form, assigned_id: e.target.value })} className="rounded-xl">
                  {members.map(m => <option key={m.user_id} value={m.user_id}>{m.profile?.full_name || 'Tanpa Nama'}</option>)}
                </Select>
              </div>

              <Select label="Topik Tiket (Opsional)" value={form.topic_id || ''} onChange={e => setForm({ ...form, topic_id: e.target.value ? Number(e.target.value) : null })} className="rounded-xl">
                <option value="">-- Pilih Topik --</option>
                {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>

              <Textarea label="Deskripsi Detail Kendala" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} className="min-h-[160px] rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
