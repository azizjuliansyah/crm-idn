
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Deal, Company, CompanyMember, Pipeline, Client, ClientCompany, LeadActivity, Profile } from '@/lib/types';
import { 
  ArrowUp, MessageSquare, RefreshCw, Pencil, 
  Clock, FileText, UserCircle, Target, Star, Trash2, ChevronLeft, ChevronRight, X, Loader2, Save
} from 'lucide-react';
import { Modal, Button, Input, Select, Textarea, SectionHeader, Breadcrumb, Timeline, TimelineItem, TimelineIcon, TimelineContent, Avatar, H2, Label, Subtext } from '@/components/ui';

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
}

export const DealDetailModal: React.FC<Props> = ({ 
  isOpen, onClose, deal, company, user, members, pipeline, 
  clients, clientCompanies, onUpdate, onDelete, onCreateQuotation, onEditQuotation 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [form, setForm] = useState<Partial<Deal>>(deal);

  const fetchActivities = useCallback(async () => {
    if (!deal?.id) return;
    setLoadingActivities(true);
    try {
      const { data, error } = await supabase
        .from('lead_activities').select('*, profile:profiles(*)').eq('deal_id', deal.id).order('created_at', { ascending: false });
      
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
      
      await supabase.from('lead_activities').insert({
        deal_id: deal.id,
        user_id: user.id,
        content: `Tahapan diubah dari ${oldStageName} ke ${newStageName}`,
        activity_type: 'status_change'
      });

      setForm(prev => ({ ...prev, stage_id: newStageId }));
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
        deal_id: deal.id,
        user_id: user.id,
        content: newComment.trim(),
        activity_type: 'comment'
      });
      if (error) throw error;
      setNewComment('');
      await fetchActivities();
    } catch (err: any) {
      console.error("Add Comment Error:", err);
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
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
        sales_id: form.sales_id,
        notes: form.notes,
        stage_id: form.stage_id || deal.stage_id,
        company_id: company.id,
        pipeline_id: pipeline.id
      };
      const { error } = await supabase.from('deals').update(dealData).eq('id', deal.id);
      if (error) throw error;
      
      onUpdate();
      onClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClientChange = (val: number) => {
    const client = clients.find(c => c.id === val);
    if (client) {
        const co = clientCompanies.find(cc => cc.id === client.client_company_id);
        setForm(prev => ({
            ...prev,
            client_id: val,
            contact_name: client.name,
            customer_company: co ? co.name : 'Perorangan',
            email: client.email,
            whatsapp: client.whatsapp
        }));
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
              <Button variant="ghost" size="sm" onClick={() => onDelete(deal.id)} className="!p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50">
                <Trash2 size={18} />
              </Button>
              {quotation ? (
                <Button 
                  variant="ghost"
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
                    leftIcon={<FileText size={14} />}
                  >
                    BUAT PENAWARAN
                  </Button>
                )
              )}
              <Button 
                onClick={handleSave} 
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
              <div className="px-2 py-0.5 border border-gray-200 rounded-sm">
                 <Label>DEAL ID: {deal.id}</Label>
              </div>
              <div className="flex items-center gap-1.5">
                 <Clock size={14} className="text-gray-400" />
                 <Subtext>Dibuat {new Date(deal.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}</Subtext>
              </div>
              {quotation && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full">
                  <Label className="text-emerald-600">{quotation.number}</Label>
                </div>
              )}
           </div>
           <div className="flex items-center gap-2">
              <Label>Expected Value:</Label>
              <span className="text-sm font-bold text-blue-600">{formatIDR(form.expected_value)}</span>
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
                   bgColor = 'bg-blue-600 text-white shadow-inner';
                   borderColor = 'border-transparent';
                }

                return (
                  <button 
                    key={stage.id}
                    onClick={() => handleStatusChange(stage.id)}
                    disabled={isProcessing}
                    className={`relative flex-1 h-full flex items-center justify-center transition-all group overflow-hidden text-[10px] font-bold uppercase tracking-widest ${bgColor} border-r last:border-r-0 ${borderColor}`}
                    style={{
                      clipPath: isLast 
                        ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 3% 50%)' 
                        : isFirst 
                          ? 'polygon(0% 0%, 97% 0%, 100% 50%, 97% 100%, 0% 100%)' 
                          : 'polygon(0% 0%, 97% 0%, 100% 50%, 97% 100%, 0% 100%, 3% 50%)'
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
             <SectionHeader 
                title="Log Aktivitas Deal"
                className="mb-6 shrink-0"
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
                         className="!min-h-[80px]"
                      />
                      <div className="absolute right-2 bottom-2">
                         <Button 
                           onClick={handleAddComment}
                           disabled={!newComment.trim() || isProcessing}
                           size="sm"
                           className="!p-1.5"
                         >
                            <ArrowUp size={16} />
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
                         <p className="text-[10px] font-bold uppercase tracking-widest">Belum ada aktivitas tercatat</p>
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
                                   <span className="text-xs font-bold text-gray-900">{act.profile?.full_name}</span>
                                   <Label className="text-[9px] text-gray-300">
                                      {new Date(act.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                                   </Label>
                                </div>
                                <p className={`text-[12px] font-medium ${act.activity_type === 'status_change' ? 'text-gray-400 italic' : 'text-gray-600'}`}>
                                   {act.content}
                                </p>
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
                title="Informasi Transaksi"
                className="mb-6 shrink-0"
             />

             <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-6">
                
                {quotation && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-sm space-y-3">
                     <div className="flex items-center justify-between">
                        <Label className="text-emerald-600">Penawaran Terhubung</Label>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-bold uppercase rounded">AKTIF</span>
                     </div>
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-white rounded flex items-center justify-center text-emerald-600 shadow-sm">
                              <FileText size={16} />
                           </div>
                           <span className="text-sm font-bold text-gray-900">{quotation.number}</span>
                        </div>
                        <Button 
                           variant="ghost"
                           size="sm"
                           onClick={() => onEditQuotation?.(quotation.id)}
                           className="!p-0 text-emerald-600 h-auto font-bold"
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
                    onChange={e => setForm({...form, name: e.target.value})}
                  />
                  <Select 
                    label="Hubungkan Client"
                    value={form.client_id || ''}
                    onChange={e => handleClientChange(Number(e.target.value))}
                  >
                    <option value="">-- Pilih Client --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.salutation ? `${c.salutation} ` : ''}{c.name}</option>)}
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="Nilai Transaksi"
                    type="number"
                    value={form.expected_value}
                    onChange={e => setForm({...form, expected_value: Number(e.target.value)})}
                    leftIcon={<Label>RP</Label>}
                    placeholder="0"
                  />
                  <Select 
                    label="PIC Sales"
                    value={form.sales_id}
                    onChange={e => setForm({...form, sales_id: e.target.value})}
                  >
                    {members.map(m => <option key={m.user_id} value={m.user_id}>{m.profile?.full_name || 'Tanpa Nama'}</option>)}
                  </Select>
                </div>

                <Textarea 
                  label="Catatan Deal"
                  value={form.notes || ''}
                  onChange={e => setForm({...form, notes: e.target.value})}
                  className="!min-h-[140px]"
                  placeholder="Tambahkan instruksi khusus atau detail teknis mengenai transaksi ini..."
                />
             </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
