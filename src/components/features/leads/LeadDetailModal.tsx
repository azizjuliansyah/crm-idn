import { ArrowUp, Trash2, Save, X, Target, Star, Clock, ArrowRightLeft, MessageSquare, RefreshCw, Pencil, ChevronLeft } from 'lucide-react';
import { Company, Profile, LeadActivity, ClientCompany, Lead, LeadStage, LeadSource, CompanyMember } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import React, { useState, useEffect } from 'react';
import { Input, Select, Textarea, Button, Subtext, Label, SectionHeader, Modal, Avatar, Badge, Breadcrumb, EmptyState, Timeline, TimelineItem, TimelineIcon, TimelineContent } from '@/components/ui';



interface LeadDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  company: Company;
  user: Profile;
  members: CompanyMember[];
  stages: LeadStage[];
  sources: LeadSource[];
  clientCompanies: ClientCompany[];
  onUpdate: () => void;
  onDelete: (id: number) => void;
  onConvertToDeal: () => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  isOpen, onClose, lead, company, user, members, stages, sources, clientCompanies, onUpdate, onDelete, onConvertToDeal
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [form, setForm] = useState<Partial<Lead>>(lead);
  const [waNumber, setWaNumber] = useState('');

  useEffect(() => {
    if (isOpen && lead) {
      setForm(lead);
      const wa = lead.whatsapp || '';
      setWaNumber(wa.startsWith('+62') ? wa.replace('+62', '') : wa);
      fetchActivities();
    }
  }, [isOpen, lead]);

  const fetchActivities = async () => {
    setLoadingActivities(true);
    try {
      const { data } = await supabase
        .from('lead_activities')
        .select('*, profile:profiles(*)')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });
      if (data) setActivities(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const oldStatus = lead.status;
      const { error } = await supabase.from('leads').update({ status: newStatus.toLowerCase() }).eq('id', lead.id);
      if (error) throw error;

      await supabase.from('lead_activities').insert({
        lead_id: lead.id,
        user_id: user.id,
        content: `Status changed from ${oldStatus} to ${newStatus.toLowerCase()}`,
        activity_type: 'status_change'
      });

      setForm(prev => ({ ...prev, status: newStatus.toLowerCase() }));
      onUpdate();
      await fetchActivities();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || isProcessing) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('lead_activities').insert({
        lead_id: lead.id,
        user_id: user.id,
        content: newComment,
        activity_type: 'comment'
      });
      if (error) throw error;
      setNewComment('');
      await fetchActivities();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    setIsProcessing(true);
    const fullWa = waNumber ? `+62${waNumber}` : '';
    const leadData = {
      salutation: form.salutation,
      name: form.name,
      whatsapp: fullWa,
      email: form.email,
      client_company_id: form.client_company_id,
      address: form.address,
      notes: form.notes,
      sales_id: form.sales_id,
      source: form.source,
      status: form.status,
      expected_value: form.expected_value || 0,
      input_date: form.input_date,
    };

    try {
      const { error } = await supabase.from('leads').update(leadData).eq('id', lead.id);
      if (error) throw error;
      onUpdate();
      await fetchActivities();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWaNumberChange = (val: string) => {
    let cleaned = val.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    setWaNumber(cleaned);
  };

  const formatIDR = (num: number = 0) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num).replace('Rp', 'Rp ');
  };

  const isQualified = form.status?.toLowerCase() === 'qualified';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="xl"
      hideClose
      noPadding
      noScroll
    >
      <div className="flex flex-col h-[88vh] bg-white text-[#111827] font-sans overflow-hidden rounded-md border border-gray-200">
        {/* HEADER SECTION */}
        <header className="px-6 h-16 flex items-center justify-between border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onClose} className="!p-1.5 text-gray-400">
              <ChevronLeft size={20} />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-rose-600 text-white flex items-center justify-center">
                <Target size={18} />
              </div>
              <Breadcrumb
                items={[
                  { label: 'Leads' },
                  { label: form.name || '', active: true }
                ]}
              />
              <Star size={16} className="text-gray-300 ml-1" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => onDelete(lead.id)} className="!p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50">
              <Trash2 size={18} />
            </Button>
            {isQualified && (
              <Button
                variant="success"
                size="sm"
                onClick={onConvertToDeal}
                leftIcon={<ArrowRightLeft size={14} />}
              >
                JADI DEAL
              </Button>
            )}
            <Button
              onClick={handleSave}
              isLoading={isProcessing}
              leftIcon={<Save size={14} />}
              variant='primary'
              size='sm'
            >
              SIMPAN
            </Button>
            <div className="w-px h-6 bg-gray-100 mx-1"></div>
            <Button variant="ghost" size="sm" onClick={onClose} className="!p-1.5 text-gray-400">
              <X size={20} />
            </Button>
          </div>
        </header>

        {/* METADATA BAR */}
        <div className="px-8 py-4 flex items-center justify-between border-b border-gray-50 bg-gray-50/30 shrink-0">
          <div className="flex items-center gap-6">
            <Badge variant="ghost" className="!bg-white border-gray-200 text-gray-500">
              ID: {lead.id}
            </Badge>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-black">
              <Clock size={14} /> Input: {form.input_date ? new Date(form.input_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[10px] !text-black uppercase tracking-tight">Expected:</Label>
            <Label className="text-sm  !text-black">{formatIDR(form.expected_value)}</Label>
          </div>
        </div>

        {/* STEPPER STATUS */}
        <div className="px-8 pt-6 pb-2 shrink-0">
          <div className="flex items-center h-10 w-full overflow-hidden rounded-sm border border-gray-200">
            {stages.map((stage, idx) => {
              const isActive = form.status?.toLowerCase() === stage.name.toLowerCase();
              const isLast = idx === stages.length - 1;
              const isFirst = idx === 0;

              let bgColor = 'bg-white text-gray-400 hover:bg-gray-50';
              let borderColor = 'border-gray-100';

              if (isActive) {
                switch (stage.name.toLowerCase()) {
                  case 'pending': bgColor = 'bg-sky-600 text-white'; break;
                  case 'qualified': bgColor = 'bg-emerald-600 text-white'; break;
                  case 'unqualified': bgColor = 'bg-rose-600 text-white'; break;
                  case 'working': bgColor = 'bg-amber-600 text-white'; break;
                  default: bgColor = 'bg-blue-600 text-white'; break;
                }
                borderColor = 'border-transparent';
              }

              return (
                <button
                  key={stage.id}
                  onClick={() => handleStatusChange(stage.name)}
                  disabled={isProcessing}
                  className={`relative flex-1 h-full flex items-center justify-center transition-all cursor-pointer font-medium text-[9px] uppercase tracking-wider ${bgColor} ${borderColor} ${isLast ? '' : 'border-r'}`}
                  style={{
                    clipPath: isLast
                      ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 4% 50%)'
                      : isFirst
                        ? 'polygon(0% 0%, 96% 0%, 100% 50%, 96% 100%, 0% 100%)'
                        : 'polygon(0% 0%, 96% 0%, 100% 50%, 96% 100%, 0% 100%, 4% 50%)'
                  }}
                >
                  {stage.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex overflow-hidden px-8 py-6 gap-10">
          {/* COLUMN LEFT: LOG AKTIVITAS */}
          <div className="w-1/2 flex flex-col min-w-0 border-r border-gray-100 pr-10">
            <SectionHeader
              title="Log Aktivitas"
              className="mb-6 shrink-0 uppercase tracking-[0.2em]"
            />

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-start gap-4 mb-8 shrink-0">
                <Avatar name={user.full_name} className="bg-gray-100 text-gray-500" />
                <div className="flex-1 relative">
                  <Textarea
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Tulis update progres..."
                    className="w-full min-h-[80px] bg-gray-50 border border-gray-200 rounded-sm p-3 text-xs font-medium outline-none focus:bg-white focus:border-blue-400 transition-all resize-none"
                  />
                  <div className="absolute right-2 bottom-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || isProcessing}
                      className="!p-1.5"
                    >
                      <ArrowUp size={16} />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                {activities.length === 0 ? (
                  <EmptyState
                    icon={<MessageSquare size={32} />}
                    title="Belum ada aktivitas"
                  />
                ) : (
                  <Timeline>
                    {activities.map((act, i) => (
                      <TimelineItem key={act.id} isLast={i === activities.length - 1}>
                        <TimelineIcon>
                          {act.activity_type === 'status_change' ? <RefreshCw size={14} className="text-blue-500" /> : <Pencil size={14} />}
                        </TimelineIcon>
                        <TimelineContent>
                          <div className="flex items-center gap-2 mb-1">
                            <Label className="text-xs  text-gray-900">{act.profile?.full_name}</Label>
                            <Label className="text-[9px]  text-gray-300 uppercase">
                              {new Date(act.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                            </Label>
                          </div>
                          <Subtext className={`text-[12px] leading-relaxed font-medium ${act.activity_type === 'status_change' ? 'text-gray-400 italic' : 'text-gray-600'}`}>
                            {act.content}
                          </Subtext>
                        </TimelineContent>
                      </TimelineItem>
                    ))}
                  </Timeline>
                )}
              </div>
            </div>
          </div>

          {/* COLUMN RIGHT: DETAIL INFORMASI */}
          <div className="w-1/2 flex flex-col min-w-0">
            <SectionHeader
              title="Detail Informasi"
              className="mb-6 shrink-0 uppercase tracking-[0.2em]"
            />

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <Select
                  label="Sapaan"
                  value={form.salutation}
                  onChange={e => setForm({ ...form, salutation: e.target.value })}
                  className="!py-2"
                >
                  <option value="-">-</option>
                  <option value="Bapak">Bapak</option>
                  <option value="Ibu">Ibu</option>
                </Select>
                <div className="col-span-2">
                  <Input
                    label="Nama Lengkap"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="!py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[9px]  text-gray-400 uppercase tracking-wider ml-0.5">WhatsApp</Label>
                  <div className="flex h-10 bg-gray-50 border border-gray-100 rounded-sm overflow-hidden focus-within:bg-white focus-within:border-blue-400 transition-all text-xs">
                    <div className="px-3 bg-gray-100/50 text-[10px]  text-gray-400 border-r border-gray-100 flex items-center">+62</div>
                    <Input
                      type="tel"
                      value={waNumber}
                      onChange={e => handleWaNumberChange(e.target.value)}
                      className="flex-1 px-3 text-xs  outline-none bg-transparent !border-none !shadow-none !h-full"
                    />
                  </div>
                </div>
                <Input
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="!py-2"
                />
              </div>

              <div className="p-5 bg-blue-50/40 border border-blue-100 rounded-sm space-y-3">
                <Label className="text-[9px]  text-blue-600 uppercase tracking-wider">Nilai Proyeksi (IDR)</Label>
                <div className="flex items-center gap-3">
                  <Label className="text-[10px]  text-blue-400 bg-white px-2 py-0.5 border border-blue-100 rounded-sm">RP</Label>
                  <Input
                    type="number"
                    value={form.expected_value}
                    onChange={e => setForm({ ...form, expected_value: Number(e.target.value) })}
                    className="bg-transparent border-none outline-none  text-xl text-gray-900 w-full"
                    placeholder="0"
                  />
                </div>
              </div>

              <Select
                label="Instansi / Perusahaan"
                value={form.client_company_id || ''}
                onChange={e => setForm({ ...form, client_company_id: e.target.value ? Number(e.target.value) : null })}
                className="!py-2"
              >
                <option value="">Personal / Individual</option>
                {clientCompanies.map(co => <option key={co.id} value={co.id}>{co.name}</option>)}
              </Select>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Tanggal Input"
                  type="date"
                  value={form.input_date || ''}
                  onChange={e => setForm({ ...form, input_date: e.target.value })}
                  className="!py-2"
                />
                <Select
                  label="Sumber Lead"
                  value={form.source}
                  onChange={e => setForm({ ...form, source: e.target.value })}
                  className="!py-2"
                >
                  {sources.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </Select>
              </div>

              <Select
                label="PIC Sales"
                value={form.sales_id}
                onChange={e => setForm({ ...form, sales_id: e.target.value })}
                className="!py-2"
              >
                {members.map(m => <option key={m.user_id} value={m.user_id}>{m.profile?.full_name || 'Tanpa Nama'}</option>)}
              </Select>

              <div className="space-y-1.5">
                <Label className="text-[9px]  text-gray-400 uppercase tracking-wider ml-0.5">Alamat / Lokasi</Label>
                <Textarea
                  value={form.address || ''}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full min-h-[60px] bg-gray-50 border border-gray-200 rounded-sm p-3 text-xs font-medium outline-none focus:bg-white focus:border-blue-400 transition-all resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </Modal>
  );
};
