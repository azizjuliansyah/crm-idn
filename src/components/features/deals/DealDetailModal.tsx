import React, { useState, useEffect, useCallback } from 'react';
import { Input, Textarea, Button, H3, Subtext, Label, SectionHeader, Modal, Avatar, Breadcrumb, Timeline, TimelineItem, TimelineIcon, TimelineContent, ComboBox, ToastType } from '@/components/ui';

import { supabase } from '@/lib/supabase';
import { Deal, Company, CompanyMember, Pipeline, Client, ClientCompany, ClientCompanyCategory, LogActivity, Profile } from '@/lib/types';
import {
  ArrowUp, MessageSquare, RefreshCw, Pencil,
  Clock, FileText, FilePlus, UserCircle, Target, Star, Trash2, ChevronLeft, ChevronRight, X, Loader2, Save, Minus, Plus, Check as CheckIcon
} from 'lucide-react';
import { ClientFormModal } from '@/components/features/clients/components/ClientFormModal';
import { ActionButton } from '@/components/shared/buttons/ActionButton';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  deal: Deal;
  company: Company;
  user: Profile;
  members: CompanyMember[];
  pipeline: Pipeline | null;
  clients: Client[];
  clientCompanies: ClientCompany[];
  onUpdate: () => void;
  onDelete: (id: number) => void;
  onCreateQuotation?: (clientId: number, dealId: number) => void;
  onEditQuotation?: (quotationId: number) => void;
  categories: ClientCompanyCategory[];
  setClientCompanies: React.Dispatch<React.SetStateAction<ClientCompany[]>>;
  setCategories: React.Dispatch<React.SetStateAction<ClientCompanyCategory[]>>;
  setToast: React.Dispatch<React.SetStateAction<{ isOpen: boolean; message: string; type: ToastType }>>;
}

export const DealDetailModal: React.FC<Props> = ({
  isOpen, onClose, deal, company, user, members, pipeline,
  clients, clientCompanies, categories, onUpdate, onDelete, onCreateQuotation, onEditQuotation,
  setClientCompanies, setCategories, setToast
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [activities, setActivities] = useState<LogActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [form, setForm] = useState<Partial<Deal>>(deal);
  const [manualFollowUp, setManualFollowUp] = useState<string>('');
  const [isFollowUpExpanded, setIsFollowUpExpanded] = useState(false);
  const [followUpDate, setFollowUpDate] = useState<string>('');
  const [followUpNotes, setFollowUpNotes] = useState<string>('');
  const [followUpErrors, setFollowUpErrors] = useState<{ count?: string; date?: string }>({});

  // Quick Add Client State
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClient, setNewClient] = useState<Partial<Client>>({ salutation: '', name: '', email: '', whatsapp: '', client_company_id: null });
  const [isProcessingQuick, setIsProcessingQuick] = useState(false);

  useEffect(() => {
    setManualFollowUp((form.follow_up || 0).toString());
    setFollowUpDate(form.follow_up_date || '');
    setFollowUpNotes(form.follow_up_notes || '');
  }, [form.follow_up, form.follow_up_date, form.follow_up_notes]);

  const fetchActivities = useCallback(async () => {
    if (!deal?.id) return;
    setLoadingActivities(true);
    try {
      const { data, error } = await supabase
        .from('log_activities').select('*, profile:profiles(*)').eq('deal_id', deal.id).order('created_at', { ascending: false });

      if (error) {
        console.error("Fetch Activities Error:", error);
        return;
      }
      if (data) setActivities(data as any);
    } catch (err) {
      console.error("Activities Exception:", err);
    } finally {
      setLoadingActivities(false);
    }
  }, [deal?.id]);

  useEffect(() => {
    if (isOpen && deal) {
      setForm(deal);
      fetchActivities();
    }
  }, [isOpen, deal, fetchActivities]);

  const handleStatusChange = async (newStageId: string) => {
    if (isProcessing || newStageId === form.stage_id) return;
    setIsProcessing(true);
    try {
      const oldStageName = pipeline?.stages?.find(s => s.id === form.stage_id)?.name || 'Unknown';
      const newStageName = pipeline?.stages?.find(s => s.id === newStageId)?.name || 'Unknown';

      const { error } = await supabase.from('deals').update({ stage_id: newStageId }).eq('id', deal.id);
      if (error) throw error;

      await supabase.from('log_activities').insert({
        deal_id: deal.id,
        user_id: user.id,
        content: `Tahapan diubah dari ${oldStageName} ke ${newStageName}`,
        activity_type: 'status_change'
      });

      setForm(prev => ({ ...prev, stage_id: newStageId }));
      setToast({ isOpen: true, message: `Tahapan diubah ke ${newStageName}`, type: 'success' });
      onUpdate();
      await fetchActivities();
    } catch (err: any) {
      setToast({ isOpen: true, message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || isProcessing) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('log_activities').insert({
        deal_id: deal.id,
        user_id: user.id,
        content: newComment.trim(),
        activity_type: 'comment'
      });
      if (error) throw error;
      setNewComment('');
      setToast({ isOpen: true, message: 'Komentar berhasil ditambahkan!', type: 'success' });
      await fetchActivities();
    } catch (err: any) {
      setToast({ isOpen: true, message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveFollowUp = async () => {
    if (isProcessing) return;
    const newValue = parseInt(manualFollowUp) || 0;
    const currentCount = form.follow_up || 0;
    const currentNextDate = form.follow_up_date || '';

    // Validation
    const errors: { count?: string; date?: string } = {};
    if (newValue <= currentCount) {
      errors.count = `Minimal follow up ke-${currentCount + 1}`;
    }
    if (!followUpDate) {
      errors.date = 'Tanggal follow up berikutnya wajib diisi';
    } else if (currentNextDate && followUpDate <= currentNextDate) {
      errors.date = 'Harus setelah jadwal follow up sebelumnya';
    }

    if (Object.keys(errors).length > 0) {
      setFollowUpErrors(errors);
      return;
    }

    setFollowUpErrors({});
    setIsProcessing(true);
    try {
      const updateData = {
        follow_up: newValue,
        follow_up_date: followUpDate || null,
        follow_up_notes: followUpNotes || null
      };

      const { error } = await supabase.from('deals').update(updateData).eq('id', deal.id);
      if (error) throw error;

      let activityContent = `Follow up baru dicatat: Ke-${newValue}`;
      if (followUpDate) activityContent += ` (Next Follow Up: ${new Date(followUpDate).toLocaleDateString('id-ID')})`;
      if (followUpNotes) activityContent += ` - Catatan: ${followUpNotes}`;

      await supabase.from('log_activities').insert({
        deal_id: deal.id,
        user_id: user.id,
        content: activityContent,
        activity_type: 'system'
      });

      setForm(prev => ({ ...prev, ...updateData }));
      setToast({ isOpen: true, message: 'Progres follow up berhasil dicatat!', type: 'success' });
      setIsFollowUpExpanded(false);
      onUpdate();
      await fetchActivities();
    } catch (err: any) {
      setToast({ isOpen: true, message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFollowUpChange = (action: 'increase' | 'decrease') => {
    const oldValue = parseInt(manualFollowUp) || 0;
    const newValue = action === 'increase' ? oldValue + 1 : Math.max(0, oldValue - 1);
    setManualFollowUp(newValue.toString());
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !pipeline) return;
    setIsProcessing(true);
    try {
      const dealData = {
        name: form.name,
        client_id: form.client_id,
        customer_company: form.customer_company,
        contact_name: form.contact_name,
        email: form.email,
        whatsapp: form.whatsapp,
        expected_value: form.expected_value || 0,
        probability: form.probability || 0,
        sales_id: form.sales_id,
        stage_id: form.stage_id || deal.stage_id,
        company_id: company.id,
        pipeline_id: pipeline.id,
        input_date: form.input_date,
        follow_up: form.follow_up || 0,
        notes: form.notes
      };
      const { error } = await supabase.from('deals').update(dealData).eq('id', deal.id);
      if (error) throw error;

      onUpdate();
    } catch (err: any) {
      setToast({ isOpen: true, message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClientChange = (val: number | string) => {
    const numVal = typeof val === 'string' ? Number(val) : val;
    const client = clients.find(c => c.id === numVal);
    if (client) {
      const co = clientCompanies.find(cc => cc.id === client.client_company_id);
      setForm(prev => ({
        ...prev,
        client_id: numVal,
        contact_name: client.name,
        customer_company: co ? co.name : 'Perorangan',
        email: client.email,
        whatsapp: client.whatsapp
      }));
    }
  };



  const handleQuickAddCategory = async (name: string) => {
    const { data, error } = await supabase
      .from('client_company_categories')
      .insert({ name: name.trim(), company_id: company.id })
      .select()
      .single();
    if (error) throw error;
    setCategories(prev => [...prev, data as any].sort((a: any, b: any) => a.name.localeCompare(b.name)));
    return data;
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
    setClientCompanies(prev => [...prev, data as any].sort((a: any, b: any) => a.name.localeCompare(b.name)));
    return data;
  };

  const handleQuickAddClient = async (savedForm: Partial<Client>) => {
    if (!savedForm.name?.trim()) {
      setToast({ isOpen: true, message: "Nama Client wajib diisi.", type: 'error' });
      return;
    }
    setIsProcessingQuick(true);
    try {
      const fullWa = savedForm.whatsapp ? `+62${savedForm.whatsapp.replace(/\\D/g, '')}` : null;
      const { data, error } = await supabase
        .from('clients')
        .insert({
          company_id: company.id,
          salutation: savedForm.salutation,
          name: savedForm.name,
          client_company_id: savedForm.client_company_id,
          email: savedForm.email,
          whatsapp: fullWa
        })
        .select()
        .single();

      if (error) throw error;

      const co = clientCompanies.find(cc => cc.id === data.client_company_id);
      setForm(prev => ({
        ...prev,
        client_id: data.id,
        contact_name: data.name,
        customer_company: co ? co.name : 'Perorangan',
        email: data.email,
        whatsapp: data.whatsapp
      }));

      onUpdate(); // Trigger refresh in parent
      setIsAddingClient(false);
      setNewClient({ salutation: '', name: '', email: '', whatsapp: '', client_company_id: null });
      setToast({ isOpen: true, message: 'Client berhasil ditambahkan!', type: 'success' });
    } catch (err: any) {
      setToast({ isOpen: true, message: "Gagal menambah client: " + err.message, type: 'error' });
    } finally {
      setIsProcessingQuick(false);
    }
  };

  const formatIDR = (num: number = 0) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num).replace('Rp', 'Rp ');
  };

  // Robust handling for 1:1 relation where quotations can be an object or an array
  const quotation: any = Array.isArray(deal.quotations) ? deal.quotations[0] : deal.quotations;

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
              <Breadcrumb
                items={[
                  { label: 'Deals' },
                  { label: form.name || 'Untitled Deal', active: true }
                ]}
              />
              <Star size={16} className="text-gray-300 ml-1" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ActionButton
              icon={Trash2}
              variant="rose"
              onClick={() => onDelete(deal.id)}
              title="Hapus Deal"
            />
            {quotation ? (
              <Button
                variant="ghost"
                size='sm'
                onClick={() => onEditQuotation?.(quotation.id)}
                className="bg-emerald-50 text-emerald-600 border border-emerald-100"
                leftIcon={<FileText size={14} />}
              >
                EDIT PENAWARAN
              </Button>
            ) : (
              onCreateQuotation && deal.client_id && (
                <Button
                  onClick={() => onCreateQuotation(deal.client_id!, deal.id)}
                  variant="success"
                  size='sm'
                  leftIcon={<FilePlus size={14} />}
                >
                  BUAT PENAWARAN
                </Button>
              )
            )}
            <Button
              onClick={handleSave}
              variant='primary'
              size='sm'
              isLoading={isProcessing}
              leftIcon={<Save size={14} />}
            >
              UPDATE DEAL
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
            <div className="px-2 pb-1 border border-gray-200 rounded-sm">
              <Label className="!capitalize !text-black !">DEAL ID: {deal.id}</Label>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-black">
              <Clock size={14} /> Input: {form.input_date ? new Date(form.input_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
            </div>
            {quotation && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full">
                <Label className="text-emerald-600 !capitalize ! font-medium">{quotation.number}</Label>
              </div>
            )}
          </div>
          <div className="flex items-center  gap-2">
            <Label className="!capitalize !text-black !">Expected Value:</Label>
            <Label className="text-sm !capitalize !text-black ! font-semibold">{formatIDR(form.expected_value)}</Label>
          </div>

        </div>

        {/* STEPPER STATUS */}
        <div className="px-8 pt-6 pb-2 shrink-0">
          <div className="flex items-center h-10 w-full overflow-hidden rounded-sm border border-gray-200">
            {pipeline?.stages?.map((stage, idx) => {
              const isActive = form.stage_id === stage.id;
              const isLast = idx === (pipeline.stages?.length || 0) - 1;
              const isFirst = idx === 0;

              let bgColor = 'bg-white text-gray-400 hover:bg-gray-50';
              let borderColor = 'border-gray-100';

              if (isActive) {
                const s = stage.name.toLowerCase();
                if (s.includes('won') || s.includes('goal') || s.includes('qualified')) bgColor = 'bg-emerald-600 text-white';
                else if (s.includes('lost') || s.includes('unqualified') || s.includes('failed')) bgColor = 'bg-rose-600 text-white';
                else if (s.includes('prospect') || s.includes('new') || s.includes('pending')) bgColor = 'bg-sky-600 text-white';
                else if (s.includes('negotiation') || s.includes('proposal') || s.includes('working')) bgColor = 'bg-amber-600 text-white';
                else if (s.includes('contacted') || s.includes('presentation')) bgColor = 'bg-indigo-600 text-white';
                else bgColor = 'bg-blue-600 text-white shadow-inner';

                borderColor = 'border-transparent';
              }

              return (
                <button
                  key={stage.id}
                  onClick={() => handleStatusChange(stage.id)}
                  disabled={isProcessing}
                  className={`relative flex-1 h-full flex items-center justify-center transition-all cursor-pointer font-medium text-[9px] uppercase  ${bgColor} ${borderColor} ${isLast ? '' : 'border-r'}`}
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

          {/* COLUMN LEFT: LOG AKTIVITAS (TIMELINE) */}
          <div className="w-1/2 flex flex-col min-w-0 border-r border-gray-100 pr-10">
            <div className="bg-gray-50 border border-gray-100 rounded-xl mb-6 shrink-0 overflow-hidden transition-all">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-100/50 transition-colors"
                onClick={() => setIsFollowUpExpanded(!isFollowUpExpanded)}
              >
                <div>
                  <H3 className="text-xs text-gray-900 mb-1 !capitalize ! font-semibold">Intensitas Follow Up</H3>
                  <Subtext className="text-[10px] text-gray-500 font-medium !capitalize !">
                    {form.follow_up || 0} Kali Follow Up • {form.follow_up_date ? `Next: ${new Date(form.follow_up_date).toLocaleDateString('id-ID')}` : 'Belum Atur Jadwal'}
                  </Subtext>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="!p-1 text-gray-400">
                    {isFollowUpExpanded ? <X size={16} /> : <Plus size={16} />}
                  </Button>
                </div>
              </div>

              {isFollowUpExpanded && (
                <div className="p-4 pt-0 border-t border-gray-100 bg-white/50 space-y-4">
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="">
                      <Label className="text-[10px] text-gray-400 uppercase font-semibold">Jumlah Follow Up</Label>
                      <div className="flex flex-col">
                        <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm w-fit">
                          <Button
                            onClick={(e) => { e.stopPropagation(); handleFollowUpChange('decrease'); }}
                            size='sm'
                            className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-md"
                          >
                            <Minus size={14} strokeWidth={3} />
                          </Button>
                          <input
                            type="number"
                            value={manualFollowUp}
                            onChange={(e) => {
                              setManualFollowUp(e.target.value);
                              if (followUpErrors.count) setFollowUpErrors(prev => ({ ...prev, count: undefined }));
                            }}
                            className="w-12 text-center text-blue-600 text-sm bg-transparent border-none outline-none py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <Button
                            onClick={(e) => { e.stopPropagation(); handleFollowUpChange('increase'); }}
                            size='sm'
                            className="p-1.5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-md"
                          >
                            <Plus size={14} strokeWidth={3} />
                          </Button>
                        </div>
                        {followUpErrors.count && <p className="text-[9px] text-rose-500 font-medium ml-1">{followUpErrors.count}</p>}
                      </div>
                    </div>
                    <div className=" flex flex-col">
                      <Label className="text-[10px] text-gray-400 uppercase font-semibold mt-2">Tgl Follow Up Berikutnya *</Label>
                      <input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => {
                          setFollowUpDate(e.target.value);
                          if (followUpErrors.date) setFollowUpErrors(prev => ({ ...prev, date: undefined }));
                        }}
                        className={`text-xs h-9 px-3 bg-white border ${followUpErrors.date ? 'border-rose-300' : 'border-gray-200'} rounded-md outline-none focus:border-blue-500 transition-all`}
                      />
                      {followUpErrors.date && <p className="text-[9px] text-rose-500 font-medium ml-1">{followUpErrors.date}</p>}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-gray-400 uppercase font-semibold">Catatan Follow Up</Label>
                    <Textarea
                      placeholder="Apa hasil follow up kali ini?"
                      value={followUpNotes}
                      onChange={(e) => setFollowUpNotes(e.target.value)}
                      className="text-xs min-h-[60px]"
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full h-9 text-xs font-semibold"
                    onClick={(e) => { e.stopPropagation(); handleSaveFollowUp(); }}
                    isLoading={isProcessing}
                  >
                    SIMPAN PROGRES FOLLOW UP
                  </Button>
                </div>
              )}
            </div>

            <SectionHeader
              title="Log Aktivitas Deal"
              className="mb-6 shrink-0 uppercase"
            />

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-start gap-4 mb-8 shrink-0">
                <Avatar
                  name={user.full_name}
                  size="md"
                  className="shrink-0"
                />
                <div className="flex-1 relative">
                  <Textarea
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Tulis catatan perkembangan deal..."
                    className="!min-h-[85px] !pb-14 resize-none"
                  />
                  <div className="absolute right-3 bottom-3">
                    <Button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || isProcessing}
                      variant="primary"
                      className="!w-9 !h-9 !p-0 flex items-center justify-center rounded-[10px] shadow-md transition-all hover:-translate-y-0.5"
                    >
                      <ArrowUp size={18} strokeWidth={2.5} />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                {loadingActivities ? (
                  <div className="py-20 text-center text-gray-300 animate-pulse">Memuat Aktivitas...</div>
                ) : activities.length === 0 ? (
                  <div className="py-20 text-center text-gray-300">
                    <MessageSquare size={32} className="mx-auto mb-2 opacity-10" />
                    <Subtext className="text-[10px]  uppercase ">Belum ada aktivitas tercatat</Subtext>
                  </div>
                ) : (
                  <Timeline>
                    {activities.map((act, i) => (
                      <TimelineItem key={act.id} isLast={i === activities.length - 1}>
                        <TimelineIcon className={act.activity_type === 'status_change' ? 'text-blue-500' : ''}>
                          {act.activity_type === 'status_change' ? <RefreshCw size={14} /> : <MessageSquare size={14} />}
                        </TimelineIcon>
                        <TimelineContent>
                          <div className="flex items-center gap-2 mb-1">
                            <Label className="text-xs  text-gray-900">{act.profile?.full_name}</Label>
                            <Label className="text-[9px] text-gray-300">
                              {new Date(act.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                            </Label>
                          </div>
                          <Subtext className={`text-[12px] font-medium ${act.activity_type === 'status_change' ? 'text-gray-400 italic' : 'text-gray-600'}`}>
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
              title="Detail Informasi Deal"
              className="mb-1 shrink-0 uppercase"
            />

            <div className="flex items-center gap-4 mb-6 px-1">
              <div className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded text-[10px] font-bold">
                Follow Up: {form.follow_up || 0}
              </div>
              {form.follow_up_date && (
                <div className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[10px] font-bold">
                  Next Follow Up: {new Date(form.follow_up_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-6">

              {quotation && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-emerald-600">Penawaran Terhubung</Label>
                    <Label className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px]  uppercase rounded">AKTIF</Label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded flex items-center justify-center text-emerald-600 shadow-sm">
                        <FileText size={16} />
                      </div>
                      <Label className="text-sm  text-gray-900">{quotation.number}</Label>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditQuotation?.(quotation.id)}
                      className="!p-0 text-emerald-600 h-auto "
                    >
                      LIHAT DETAIL
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <Input
                  label="Nama Deal / Project"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
                <ComboBox
                  label="Hubungkan Client"
                  value={form.client_id?.toString() || ''}
                  onChange={(val: string | number) => handleClientChange(val)}
                  options={clients.map(c => ({
                    value: c.id.toString(),
                    label: `${c.salutation ? `${c.salutation} ` : ''}${c.name}`,
                    sublabel: clientCompanies.find(cc => cc.id === c.client_company_id)?.name || 'Perorangan'
                  }))}
                  onAddNew={() => {
                    setNewClient({ salutation: '', name: '', email: '', whatsapp: '', client_company_id: null });
                    setIsAddingClient(true);
                  }}
                  addNewLabel="Tambah Client Baru"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Input
                  label="Tanggal Input"
                  type="date"
                  value={form.input_date || ''}
                  onChange={e => setForm({ ...form, input_date: e.target.value })}
                />
                <Input
                  label="Nilai Transaksi"
                  type="number"
                  value={form.expected_value}
                  onChange={e => setForm({ ...form, expected_value: Number(e.target.value) })}
                  leftIcon={<Label>RP</Label>}
                  placeholder="0"
                />
                <ComboBox
                  label="Probabilitas (%)"
                  value={form.probability?.toString() || '0'}
                  onChange={(val: string | number) => setForm({ ...form, probability: Number(val) })}
                  options={[
                    { value: '0', label: '0%' },
                    { value: '25', label: '25%' },
                    { value: '50', label: '50%' },
                    { value: '75', label: '75%' },
                    { value: '100', label: '100%' },
                  ]}
                  hideSearch
                />
              </div>

              <ComboBox
                label="PIC Sales"
                value={form.sales_id || ''}
                onChange={(val: string | number) => setForm({ ...form, sales_id: val.toString() })}
                options={members.map(m => ({
                  value: m.user_id.toString(),
                  label: m.profile?.full_name || 'Tanpa Nama',
                  sublabel: m.profile?.email
                }))}
              />

              <Textarea
                label="Catatan Deal"
                value={form.notes || ''}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="!min-h-[140px]"
                placeholder="Tambahkan instruksi khusus atau detail teknis mengenai transaksi ini..."
              />
            </div>
          </div>
        </div>
      </div>
      <ClientFormModal
        isOpen={isAddingClient}
        onClose={() => setIsAddingClient(false)}
        onSave={handleQuickAddClient}
        form={newClient}
        setForm={setNewClient}
        isProcessing={isProcessingQuick}
        clientCompanies={clientCompanies}
        categories={categories}
        companyId={company.id}
        onQuickAddCompany={handleQuickAddCompany}
        onQuickAddCategory={handleQuickAddCategory}
      />
    </Modal>
  );
};
