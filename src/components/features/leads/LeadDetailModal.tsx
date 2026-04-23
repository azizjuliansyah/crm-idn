'use client';
import { ArrowUp, Trash2, Save, X, Target, Star, Clock, ArrowRightLeft, MessageSquare, RefreshCw, Pencil, ChevronLeft, User } from 'lucide-react';
import { Company, Profile, LogActivity, ClientCompany, Lead, LeadStage, LeadSource, CompanyMember, ClientCompanyCategory, Client } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Input, Textarea, Button, Subtext, Label, SectionHeader, Modal, Avatar, Badge, Breadcrumb, EmptyState, Timeline, TimelineItem, TimelineIcon, TimelineContent, ComboBox } from '@/components/ui';
import { ClientFormModal } from '@/components/features/clients/components/ClientFormModal';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { useAppStore } from '@/lib/store/useAppStore';

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
  categories: ClientCompanyCategory[];
  onUpdate: () => void;
  onDelete: (id: number) => void;
  onConvertToDeal: () => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  isOpen, onClose, lead, company, user, members, stages, sources, clientCompanies, categories, onUpdate, onDelete, onConvertToDeal
}) => {
  const queryClient = useQueryClient();
  const { showToast } = useAppStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [activities, setActivities] = useState<LogActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [form, setForm] = useState<Partial<Lead>>(lead);
  const [waNumber, setWaNumber] = useState('');

  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'baru' | 'lama'>('baru');

  // ClientFormModal State
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientForm, setClientForm] = useState<Partial<Client>>({ salutation: '', name: '', email: '', whatsapp: '', client_company_id: null });
  const [isProcessingQuick, setIsProcessingQuick] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadClients();
    }
  }, [isOpen]);

  const loadClients = async () => {
    try {
      const { data } = await supabase.from('clients').select('*, client_company:client_companies(*)').eq('company_id', company.id).order('name');
      if (data) {
        setClients(data);
        if (lead) {
          // Find if there is a client matching lead name and company
          const currentClient = data.find((c: Client) =>
            c.name === lead.name &&
            c.email === lead.email &&
            c.client_company_id === lead.client_company_id
          );
          if (currentClient) {
            setSelectedClientId(currentClient.id.toString());
            setActiveTab('lama');
          } else {
            setActiveTab('baru');
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find(c => c.id.toString() === clientId);
    if (client) {
      setForm(prev => ({
        ...prev,
        salutation: client.salutation || '',
        name: client.name || '',
        email: client.email || '',
        client_company_id: client.client_company_id,
      }));
      if (client.whatsapp) {
        setWaNumber(client.whatsapp.startsWith('+62') ? client.whatsapp.replace('+62', '') : client.whatsapp);
      } else {
        setWaNumber('');
      }
    } else {
      setForm(prev => ({
        ...prev,
        salutation: '',
        name: '',
        email: '',
        client_company_id: null,
      }));
      setWaNumber('');
    }
  };

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
        .from('log_activities')
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

      await supabase.from('log_activities').insert({
        lead_id: lead.id,
        user_id: user.id,
        content: `Status changed from ${oldStatus} to ${newStatus.toLowerCase()}`,
        activity_type: 'status_change'
      });

      setForm(prev => ({ ...prev, status: newStatus.toLowerCase() }));
      showToast(`Status berhasil diubah ke ${newStatus.toUpperCase()}`, 'success');
      await fetchActivities();
      
      if (newStatus.toLowerCase() === 'qualified') {
        onConvertToDeal();
      }
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
        lead_id: lead.id,
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
      showToast(error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickAddCategory = async (name: string) => {
    const { data, error } = await supabase.from('client_company_categories').insert({ company_id: company.id, name: name.trim() }).select().single();
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['client-company-categories', company.id] });
    return data;
  };

  const handleQuickAddCompany = async (coData: any) => {
    const { data, error } = await supabase.from('client_companies').insert({
      company_id: company.id,
      ...coData
    }).select().single();
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['client-companies', company.id] });
    return data;
  };

  const handleSaveClient = async (formData: Partial<Client>) => {
    if (!formData.name?.trim()) return;
    setIsProcessingQuick(true);
    try {
      const { data, error } = await supabase.from('clients').insert({
        company_id: company.id,
        salutation: formData.salutation,
        name: formData.name.trim(),
        client_company_id: formData.client_company_id,
        email: formData.email,
        whatsapp: formData.whatsapp ? `+62${formData.whatsapp.replace(/\D/g, '')}` : null
      }).select().single();
      if (error) throw error;

      const freshRes = await supabase.from('clients').select('*, client_company:client_companies(*)').eq('company_id', company.id).order('name');
      if (freshRes.data) setClients(freshRes.data);

      handleClientSelect(String(data.id));
      setIsClientModalOpen(false);
      showToast('Client berhasil ditambahkan!', 'success');
      setClientForm({ salutation: '', name: '', email: '', whatsapp: '', client_company_id: null });
    } catch (err: any) { showToast(err.message, 'error'); } finally { setIsProcessingQuick(false); }
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
            <ActionButton
              icon={Trash2}
              variant="rose"
              onClick={() => onDelete(lead.id)}
              title="Hapus Lead"
            />
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
            <Label className="text-[10px] !text-black font-bold uppercase ">Expected:</Label>
            <Label className="text-sm font-bold !text-black">{formatIDR(form.expected_value)}</Label>
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
                  className={`relative flex-1 h-full flex items-center justify-center transition-all cursor-pointer font-bold text-[9px] uppercase  ${bgColor} ${borderColor} ${isLast ? '' : 'border-r'}`}
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
              title="Log Aktivitas Lead"
              className="mb-6 shrink-0 uppercase"
            />

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-start gap-4 mb-8 shrink-0">
                <Avatar name={user.full_name} className="bg-gray-100 text-gray-500" />
                <div className="flex-1 relative">
                  <Textarea
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Tulis update progres..."
                    className="w-full min-h-[80px] bg-gray-50 border border-gray-200 rounded-sm p-3 text-xs font-bold outline-none focus:bg-white focus:border-blue-400 transition-all resize-none"
                  />
                  <div className="absolute right-2 bottom-3">
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
                            <Label className="text-xs font-bold text-gray-900">{act.profile?.full_name}</Label>
                            <Label className="text-[9px] font-bold text-gray-300 uppercase">
                              {new Date(act.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                            </Label>
                          </div>
                          <Subtext className={`text-[12px] leading-relaxed font-bold ${act.activity_type === 'status_change' ? 'text-gray-400 italic' : 'text-gray-600'}`}>
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
              title="Detail Informasi Lead"
              className="mb-6 shrink-0 uppercase"
            />

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-6">
              {activeTab === 'lama' && (
                <div className="col-span-4">
                  <ComboBox
                    label="Pilih Client (Atau Tambah Baru)"
                    placeholder="Pilih Pelanggan"
                    value={selectedClientId}
                    onChange={(val: string | number) => handleClientSelect(val.toString())}
                    options={[
                      ...clients.map(c => ({
                        value: c.id.toString(),
                        label: c.name,
                        sublabel: c.client_company?.name || 'PERSONAL'
                      }))
                    ]}
                    onAddNew={() => setIsClientModalOpen(true)}
                    addNewLabel="Tambah Pelanggan Baru"
                    leftIcon={<User size={16} />}
                  />
                </div>
              )}

              {activeTab === 'baru' && (
                <>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-1">
                      <ComboBox
                        label="Sapaan"
                        value={form.salutation}
                        onChange={(val: string | number) => setForm({ ...form, salutation: val.toString() })}
                        options={[
                          { value: '-', label: '-' },
                          { value: 'Bapak', label: 'Bapak' },
                          { value: 'Ibu', label: 'Ibu' },
                        ]}
                        hideSearch
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        label="Nama Lengkap"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[9px]  text-gray-400 font-bold uppercase  ml-0.5">WhatsApp</Label>
                      <div className="flex h-10 bg-gray-50 border border-gray-100 rounded-sm overflow-hidden focus-within:bg-white focus-within:border-blue-400 transition-all text-xs">
                        <div className="px-3 bg-gray-100/50 text-[10px]  text-gray-400 border-r border-gray-100 flex items-center font-bold">+62</div>
                        <input
                          type="tel"
                          value={waNumber}
                          onChange={e => handleWaNumberChange(e.target.value)}
                          className="flex-1 px-3 text-xs font-bold outline-none bg-transparent border-none shadow-none h-full"
                        />
                      </div>
                    </div>
                    <Input
                      label="Email"
                      type="email"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div className="p-5 bg-blue-50/40 border border-blue-100 rounded-sm space-y-2">
                <Label className="text-[9px] font-bold text-blue-600 uppercase ">Nilai Proyeksi (IDR)</Label>
                <div className="flex items-center gap-3">
                  <Label className="text-[10px] font-bold text-blue-400 bg-white px-2 py-0.5 border border-blue-100 rounded-sm">RP</Label>
                  <input
                    type="number"
                    value={form.expected_value}
                    onChange={e => setForm({ ...form, expected_value: Number(e.target.value) })}
                    className="bg-transparent border-none outline-none font-bold text-xl text-gray-900 w-full"
                    placeholder="0"
                  />
                </div>
              </div>

              {activeTab === 'baru' && (
                <div className="space-y-3">
                  <ComboBox
                    value={form.client_company_id?.toString() || ''}
                    label="Pilih Perusahaan"
                    onChange={(val: string | number) => setForm({ ...form, client_company_id: val ? Number(val) : null })}
                    options={[
                      { value: '', label: 'Personal / Individual' },
                      ...clientCompanies.map(co => ({ value: co.id.toString(), label: co.name }))
                    ]}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Tanggal Input"
                  type="date"
                  value={form.input_date || ''}
                  onChange={e => setForm({ ...form, input_date: e.target.value })}
                />
                <ComboBox
                  label="Sumber Lead"
                  value={form.source}
                  onChange={(val: string | number) => setForm({ ...form, source: val.toString() })}
                  options={sources.map(s => ({ value: s.name, label: s.name }))}
                />
              </div>

              <ComboBox
                label="PIC Sales"
                value={form.sales_id}
                onChange={(val: string | number) => setForm({ ...form, sales_id: val.toString() })}
                options={members.map(m => ({ value: m.user_id, label: m.profile?.full_name || 'Tanpa Nama' }))}
              />

              <div className="space-y-1.5">
                <Label className="text-[9px]  text-gray-400 font-bold uppercase  ml-0.5">Alamat / Lokasi</Label>
                <Textarea
                  value={form.address || ''}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full min-h-[60px] bg-gray-50 border border-gray-200 rounded-sm p-3 text-xs font-bold outline-none focus:bg-white focus:border-blue-400 transition-all resize-none"
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

      <ClientFormModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        form={clientForm}
        setForm={setClientForm}
        isProcessing={isProcessingQuick}
        onSave={handleSaveClient}
        clientCompanies={clientCompanies}
        categories={categories}
        companyId={company.id}
      />
    </Modal>
  );
};
