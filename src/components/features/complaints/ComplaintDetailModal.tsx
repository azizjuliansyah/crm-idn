import React, { useState, useEffect, useCallback } from 'react';
import { Input, Textarea, Button, H2, Subtext, Modal, Avatar, Badge, Timeline, TimelineItem, TimelineIcon, TimelineContent, ComboBox, Label } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { SupportTicket, Profile, Company, CompanyMember, SupportStage, Client, LogActivity, TicketTopic, ClientCompany, ClientCompanyCategory } from '@/lib/types';
import {
  ChevronLeft, Trash2, Loader2, Save, X,
  ArrowUp, MessageSquare, RefreshCw,
  Clock, ShieldAlert, Check
} from 'lucide-react';
import { ClientFormModal } from '@/components/features/clients/components/ClientFormModal';

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

export const ComplaintDetailModal: React.FC<Props> = ({
  isOpen, onClose, ticket, company, user, members, stages, clients, topics, onUpdate, onDelete
}) => {
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
        content: `Status keluhan diubah dari ${oldStatus} ke ${newStatus.toLowerCase()}`,
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
      const { error } = await supabase.from('log_activities').insert({
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
        status: form.status
      }).eq('id', ticket.id);
      if (error) throw error;
      onUpdate();
      onClose();
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
          whatsapp: f.whatsapp ? `+62${f.whatsapp.replace(/\\D/g, '')}` : null
        })
        .select()
        .single();
      if (error) throw error;
      setForm((prev: any) => ({ ...prev, client_id: data.id }));
      setIsAddingClient(false);
      setNewClientForm({ salutation: '', name: '', email: '', whatsapp: '', client_company_id: null });
      onUpdate();
    } catch (err: any) {
      alert("Gagal menambah client: " + err.message);
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
    } catch (err: any) {
      alert(err.message);
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
      <div className="flex flex-col h-[88vh] bg-white text-[#111827] overflow-hidden rounded-md border border-gray-200">
        <header className="px-6 h-16 flex items-center justify-between border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onClose} className="!p-1.5 text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-100 rounded transition-all"><ChevronLeft size={20} /></Button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-100"><ShieldAlert size={18} /></div>
              <H2 className="text-base tracking-tight text-gray-900 uppercase">{form.title}</H2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => onDelete(ticket.id)} className="!p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50"><Trash2 size={18} /></Button>
            <Button
              onClick={handleSave}
              disabled={isProcessing}
              isLoading={isProcessing}
              leftIcon={<Save size={14} />}
              variant="danger"
              size="sm"
              className=" uppercase tracking-wider"
            >
              UPDATE COMPLAINT
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="!p-1.5 text-gray-400 hover:text-gray-900 ml-2"><X size={20} /></Button>
          </div>
        </header>

        <div className="px-8 py-4 flex items-center justify-between border-b border-gray-50 bg-gray-50/30 shrink-0">
          <div className="flex items-center gap-6">
            <Badge variant="ghost" className="text-gray-500 bg-white uppercase tracking-tight px-2 py-0.5 border border-gray-200">ID: {ticket.id}</Badge>
            <Subtext className="flex items-center gap-1.5"><Clock size={14} /> Terdaftar {new Date(ticket.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', year: 'numeric' })}</Subtext>
          </div>
          <div className="flex items-center gap-2">
            <Subtext className="text-[10px]  text-gray-400 uppercase tracking-tight mr-2">Prioritas:</Subtext>
            <Badge variant={form.priority === 'urgent' ? 'danger' : 'warning'} className=" uppercase">{form.priority}</Badge>
          </div>
        </div>

        <div className="px-8 pt-6 pb-2 shrink-0">
          <div className="flex items-center h-10 w-full overflow-hidden rounded-sm border border-gray-200">
            {stages.map((stage, idx) => {
              const isActive = form.status?.toLowerCase() === stage.name.toLowerCase();
              const isLast = idx === stages.length - 1;
              const isFirst = idx === 0;
              let bgColor = 'bg-white text-gray-400 hover:bg-gray-50';
              if (isActive) bgColor = 'bg-rose-600 text-white shadow-inner';
              return (
                <Button
                  key={stage.id}
                  variant={isActive ? 'danger' : 'ghost'}
                  onClick={() => handleStatusChange(stage.name)}
                  className={`relative flex-1 h-full flex items-center justify-center transition-all text-[10px]  uppercase tracking-tight ${isActive ? 'shadow-inner' : 'text-gray-400 hover:bg-gray-50'} border-r last:border-r-0`}
                  style={{ clipPath: isLast ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 3% 50%)' : isFirst ? 'polygon(0% 0%, 97% 0%, 100% 50%, 97% 100%, 0% 100%)' : 'polygon(0% 0%, 97% 0%, 100% 50%, 97% 100%, 0% 100%, 3% 50%)' }}
                >
                  {stage.name}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden px-8 py-6 gap-10">
          <div className="w-1/2 flex flex-col border-r border-gray-100 pr-10">
            <Subtext className="!text-[10px]  uppercase tracking-[0.2em] mb-6">Penanganan & Resolusi</Subtext>
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-start gap-4 mb-8">
                <Avatar name={user.full_name} src={user.avatar_url} size="sm" className="bg-rose-600 text-white shadow-md shadow-rose-100" />
                <div className="flex-1 relative">
                  <Textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Tulis langkah penyelesaian..." className="!min-h-[80px] !text-xs !bg-gray-50 !mb-0" />
                  <div className="absolute right-2 bottom-2"><Button onClick={handleAddComment} disabled={!newComment.trim()} size="sm" className="!p-1.5 bg-gray-900 text-white rounded hover:bg-black transition-all disabled:opacity-20"><ArrowUp size={16} /></Button></div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                {loadingActivities ? <div className="py-20 text-center animate-pulse text-[10px] uppercase  text-gray-300">Mensinkronisasi Aktivitas...</div> : activities.length === 0 ? <div className="py-20 text-center text-gray-300 italic text-[10px] uppercase tracking-tight">Belum ada progres tercatat</div> : (
                  <Timeline>
                    {activities.map((act) => (
                      <TimelineItem key={act.id}>
                        <TimelineIcon className={act.activity_type === 'status_change' ? 'bg-blue-50 text-blue-500' : 'bg-gray-50 text-gray-500'}>
                          {act.activity_type === 'status_change' ? <RefreshCw size={14} /> : <MessageSquare size={14} />}
                        </TimelineIcon>
                        <TimelineContent>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="ghost" className="!p-0 text-xs  text-gray-900">{act.profile?.full_name}</Badge>
                            <Badge variant="ghost" className="!p-0 text-[9px]  text-gray-300 uppercase">{new Date(act.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</Badge>
                          </div>
                          <Subtext className={`text-[12px] font-medium leading-relaxed ${act.activity_type === 'status_change' ? 'text-gray-400 italic' : 'text-gray-600'}`}>{act.content}</Subtext>
                        </TimelineContent>
                      </TimelineItem>
                    ))}
                  </Timeline>
                )}
              </div>
            </div>
          </div>

          <div className="w-1/2 flex flex-col space-y-6 overflow-y-auto custom-scrollbar pr-2">
            <Subtext className="!text-[10px]  uppercase tracking-[0.2em]">Data Pelaporan</Subtext>
            <div className="space-y-4">
              <Input label="Subjek / Masalah" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="!" />
              <div className="grid grid-cols-2 gap-4">
                <ComboBox
                  label="Pelapor (Client)"
                  value={form.client_id || ''}
                  onChange={(val: string | number) => setForm({ ...form, client_id: Number(val) })}
                  options={clients.map(c => ({
                    value: c.id.toString(),
                    label: c.name,
                    sublabel: `${c.salutation || ''} ${c.whatsapp || c.email || ''}`.trim()
                  }))}
                  className="rounded-md"
                  onAddNew={() => setIsAddingClient(true)}
                  addNewLabel="Tambah Client Baru"
                />


                <ComboBox
                  label="PIC Penanggung Jawab"
                  value={form.assigned_id || ''}
                  onChange={(val: string | number) => setForm({ ...form, assigned_id: val.toString() })}
                  options={members.map(m => ({ value: m.user_id.toString(), label: m.profile?.full_name || 'Tanpa Nama' }))}
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
                    label="Topik Keluhan (Opsional)"
                    value={form.topic_id || ''}
                    onChange={(val: string | number) => setForm({ ...form, topic_id: val ? Number(val) : null })}
                    options={topics.map(t => ({ value: t.id.toString(), label: t.name }))}
                    onAddNew={() => setIsAddingTopic(true)}
                    addNewLabel="Tambah Topik Baru"
                    className="rounded-md"
                  />
                )}
              </div>

              <Textarea label="Kronologi Kejadian" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} className="min-h-[140px]" />
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
        onQuickAddCompany={handleQuickAddCompany}
        onQuickAddCategory={handleQuickAddCategory}
      />
      <style>{` .custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #eee; border-radius: 10px; } `}</style>
    </Modal>
  );
};
