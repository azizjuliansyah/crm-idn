import React, { useState, useEffect, useCallback } from 'react';
import { Input, Textarea, Button, H2, Subtext, Label, Modal, Badge, Timeline, TimelineItem, TimelineIcon, TimelineContent, ComboBox, SectionHeader } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { SupportTicket, Profile, Company, CompanyMember, SupportStage, Client, LogActivity, TicketTopic, ClientCompany, ClientCompanyCategory } from '@/lib/types';
import {
  ChevronLeft, Headset, Trash2, Loader2, Save, X,
  ArrowUp, MessageSquare, RefreshCw, Layers,
  Clock, Check
} from 'lucide-react';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { ClientFormModal } from '@/components/features/clients/components/ClientFormModal';
import { useAppStore } from '@/lib/store/useAppStore';

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
  const { showToast } = useAppStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [activities, setActivities] = useState<LogActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [form, setForm] = useState<Partial<SupportTicket>>(ticket);

  // Quick Add Client State
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClientForm, setNewClientForm] = useState<Partial<Client>>({
    salutation: '',
    name: '',
    email: '',
    whatsapp: '',
    client_company_id: null
  });
  const [isProcessingQuick, setIsProcessingQuick] = useState(false);

  // Quick Add Topic State
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');

  // Data for quick add
  const [clientCompanies, setClientCompanies] = useState<ClientCompany[]>([]);
  const [categories, setCategories] = useState<ClientCompanyCategory[]>([]);

  const fetchActivities = useCallback(async () => {
    if (!ticket?.id) return;
    setLoadingActivities(true);
    try {
      const { data } = await supabase.from('log_activities').select('*, profile:profiles(*)').eq('ticket_id', ticket.id).order('created_at', { ascending: false });
      if (data) setActivities(data as any);
    } finally {
      setLoadingActivities(false);
    }
  }, [ticket?.id]);

  useEffect(() => {
    if (isOpen && ticket) {
      setForm(ticket);
      fetchActivities();

      const fetchQuickAddData = async () => {
        const [coRes, catRes] = await Promise.all([
          supabase.from('client_companies').select('*').eq('company_id', company.id).order('name'),
          supabase.from('client_company_categories').select('*').eq('company_id', company.id).order('name')
        ]);
        if (coRes.data) setClientCompanies(coRes.data);
        if (catRes.data) setCategories(catRes.data);
      };
      fetchQuickAddData();
    }
  }, [isOpen, ticket, fetchActivities, company.id]);

  const handleStatusChange = async (newStatus: string) => {
    if (isProcessing || newStatus.toLowerCase() === form.status?.toLowerCase()) return;
    setIsProcessing(true);
    try {
      const oldStatus = ticket.status;
      const { error } = await supabase.from('support_tickets').update({ status: newStatus.toLowerCase() }).eq('id', ticket.id);
      if (error) throw error;

      await supabase.from('log_activities').insert({
        ticket_id: ticket.id,
        user_id: user.id,
        content: `Status diubah dari ${oldStatus} ke ${newStatus.toLowerCase()}`,
        activity_type: 'status_change'
      });

      setForm(prev => ({ ...prev, status: newStatus.toLowerCase() }));
      showToast(`Status diubah ke ${newStatus.toUpperCase()}`, 'success');
      onUpdate();
      await fetchActivities();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || isProcessing) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('log_activities').insert({
        ticket_id: ticket.id,
        user_id: user.id,
        content: newComment,
        activity_type: 'comment'
      });
      if (error) throw error;
      setNewComment('');
      showToast('Komentar berhasil ditambahkan!', 'success');
      await fetchActivities();
    } catch (err: any) {
      showToast(err.message, 'error');
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
      showToast('Ticket berhasil diperbarui!', 'success');
      onUpdate();
      onClose();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickAddClient = async (f: Partial<Client>) => {
    if (!f.name?.trim()) return;
    setIsProcessingQuick(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          ...f,
          company_id: company.id,
          whatsapp: f.whatsapp ? `+62${f.whatsapp.replace(/\D/g, '')}` : null
        })
        .select()
        .single();
      if (error) throw error;
      setForm((prev: any) => ({ ...prev, client_id: data.id }));
      setIsAddingClient(false);
      setNewClientForm({ salutation: '', name: '', email: '', whatsapp: '', client_company_id: null });
      onUpdate();
      showToast('Client baru berhasil ditambahkan!', 'success');
    } catch (err: any) {
      showToast("Gagal menambah client: " + err.message, 'error');
    } finally {
      setIsProcessingQuick(false);
    }
  };

  const handleQuickAddCompany = async (coData: any) => {
    const { data, error } = await supabase
      .from('client_companies')
      .insert({
        company_id: company.id,
        ...coData
      })
      .select()
      .single();
    if (error) throw error;
    setClientCompanies((prev: ClientCompany[]) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
  };

  const handleQuickAddTopic = async () => {
    if (!newTopicName.trim()) return;
    try {
      const { data, error } = await supabase
        .from('ticket_topics')
        .insert({ name: newTopicName, company_id: company.id })
        .select()
        .single();

      if (error) throw error;
      onUpdate();
      setForm({ ...form, topic_id: data.id });
      setNewTopicName('');
      setIsAddingTopic(false);
      showToast('Topik baru berhasil ditambahkan!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleQuickAddCategory = async (name: string) => {
    const { data, error } = await supabase
      .from('client_company_categories')
      .insert({ name: name.trim(), company_id: company.id })
      .select()
      .single();
    if (error) throw error;
    setCategories((prev: ClientCompanyCategory[]) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="xl" hideClose noPadding noScroll>
      <div className="flex flex-col h-[90vh] bg-white text-gray-900 overflow-hidden rounded-2xl border border-gray-100 shadow-2xl">
        <header className="px-6 h-16 flex items-center justify-between border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onClose} className="!p-1.5 text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-900 transition-all rounded-xl"><ChevronLeft size={20} /></Button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-100 group">
                <Headset size={18} className="group-hover:rotate-12 transition-transform" />
              </div>
              <H2 className="text-base   uppercase">{form.title}</H2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ActionButton
              icon={Trash2}
              variant="rose"
              onClick={() => onDelete(ticket.id)}
              title="Hapus Tiket"
            />
            <Button onClick={handleSave} disabled={isProcessing} isLoading={isProcessing} leftIcon={<Save size={14} />} variant="primary" size='sm' className="rounded-md">
              UPDATE TICKET
            </Button>
            <div className="w-px h-6 bg-gray-200 mx-1"></div>
            <Button variant="ghost" onClick={onClose} className="!p-1.5 text-gray-400 hover:text-gray-900 rounded-xl"><X size={20} /></Button>
          </div>
        </header>

        <div className="px-8 py-4 flex items-center justify-between border-b border-gray-100 bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-6">
            <Badge variant="ghost" className="px-2.5 py-1 border border-gray-200 text-[9px]  text-gray-600 bg-white uppercase  ring-1 ring-inset ring-gray-100">ID TICKET: {ticket.id}</Badge>
            <div className="flex items-center gap-1.5 text-[10px]  text-gray-400 uppercase "><Clock size={14} className="text-gray-300" /> Dibuat {new Date(ticket.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            <Badge variant={form.type === 'complaint' ? 'danger' : 'primary'} className="flex items-center gap-1.5 px-3 py-1 text-[9px]  uppercase tracking-[0.2em] border-none ring-1 ring-inset shadow-sm">
              <Layers size={10} /> {form.type === 'complaint' ? 'COMPLAINT' : 'STANDARD TICKET'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[10px]  text-gray-400 uppercase ">Urgensi:</Label>
            <Badge variant={form.priority === 'urgent' ? 'danger' : 'secondary'} className="text-[10px] py-1 px-3  uppercase  ring-1 ring-inset">{form.priority}</Badge>
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
            <SectionHeader
              title="Log Percakapan & Status"
              className="mb-6 shrink-0 uppercase"
            />
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-start gap-4 mb-8">
                <div className="flex-1 relative">
                  <Textarea
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Tulis update penyelesaian di sini..."
                    className="min-h-[90px] rounded-2xl border-gray-100 focus:border-primary focus:ring-primary/10 transition-all text-xs font-medium placeholder:text-gray-300"
                  />
                  <div className="absolute right-2.5 bottom-2.5">
                    <Button
                      variant="primary"
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="!p-2 mb-1 !h-auto !rounded-md"
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
                          <Label className="text-[11px]  text-gray-900 ">{act.profile?.full_name}</Label>
                          <Label className="text-[8px]  text-gray-300 uppercase  bg-gray-50 px-1.5 py-0.5 rounded">{new Date(act.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • {new Date(act.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}</Label>
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
            <SectionHeader
              title="Konfigurasi Data Tiket"
              className="mb-6 shrink-0 uppercase"
            />

            <div className="space-y-6">
              <ComboBox
                label="Klasifikasi Masalah"
                value={form.type || 'ticket'}
                onChange={(val: string | number) => setForm({ ...form, type: val as any })}
                options={[
                  { value: 'ticket', label: 'Standard Ticket (Support)' },
                  { value: 'complaint', label: 'Complaint (Keluhan)' },
                ]}
              />

              <Input label="Subjek / Judul Tiket" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="rounded-ms" />

              <div className="grid grid-cols-2 gap-4">
                <ComboBox
                  label="Client Pelapor"
                  value={form.client_id || ''}
                  onChange={(val: string | number) => setForm({ ...form, client_id: Number(val) })}
                  options={clients.map(c => ({
                    value: c.id.toString(),
                    label: c.name,
                    sublabel: `${c.salutation || ''} ${c.whatsapp || c.email || ''}`.trim()
                  }))}
                  className="rounded-ms"
                  onAddNew={() => setIsAddingClient(true)}
                  addNewLabel="Tambah Client Baru"
                />


                <ComboBox
                  label="PIC Tim Support"
                  value={form.assigned_id || ''}
                  onChange={(val: string | number) => setForm({ ...form, assigned_id: val.toString() })}
                  options={members.map(m => ({
                    value: m.user_id.toString(),
                    label: m.profile?.full_name || 'Tanpa Nama',
                    sublabel: m.profile?.email
                  }))}
                  className="rounded-ms"
                />
              </div>

              <div className="space-y-1.5">
                {isAddingTopic ? (
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-[9px] text-gray-400 uppercase ml-1">Topik Baru*</Label>
                      <Input
                        autoFocus
                        type="text"
                        value={newTopicName}
                        onChange={e => setNewTopicName(e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-rose-100 rounded-lg text-xs outline-none h-[42px]"
                        placeholder="Nama Topik..."
                      />
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        onClick={handleQuickAddTopic}
                        disabled={!newTopicName.trim()}
                        className="!px-3 bg-rose-600 text-white rounded-lg h-[42px]"
                        variant="danger"
                      >
                        <Check size={14} />
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setIsAddingTopic(false)}
                        className="!px-3 bg-gray-100 text-gray-400 rounded-lg h-[42px]"
                        variant="secondary"
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <ComboBox
                    label={form.type === 'complaint' ? "Topik Keluhan (Opsional)" : "Topik Tiket (Opsional)"}
                    value={form.topic_id || ''}
                    onChange={(val: string | number) => setForm({ ...form, topic_id: val ? Number(val) : null })}
                    options={topics.map(t => ({ value: t.id.toString(), label: t.name }))}
                    onAddNew={() => setIsAddingTopic(true)}
                    addNewLabel="Tambah Topik Baru"
                    className="rounded-ms"
                  />
                )}
              </div>

              <Textarea label="Deskripsi Detail Kendala" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} className="min-h-[160px] rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
      <ClientFormModal
        isOpen={isAddingClient}
        onClose={() => setIsAddingClient(false)}
        onSave={handleQuickAddClient}
        form={newClientForm}
        setForm={setNewClientForm}
        isProcessing={isProcessingQuick}
        clientCompanies={clientCompanies}
        categories={categories}
        companyId={company.id}
      />
    </Modal>
  );
};
