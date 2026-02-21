
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Deal, Company, CompanyMember, Pipeline, Client, ClientCompany, LeadActivity, Profile } from '@/lib/types';
import { 
  ChevronLeft, Target, Star, Trash2, Loader2, Save, X, 
  ArrowUp, MessageSquare, RefreshCw, Pencil, 
  Clock, FileText, UserCircle
} from 'lucide-react';
import { Modal } from './Modal';

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
        .from('lead_activities').select('*, profiles(*)').eq('deal_id', deal.id).order('created_at', { ascending: false });
      
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
              <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors border border-transparent hover:border-gray-100 rounded">
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                    <Target size={18} />
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-gray-400 font-medium text-sm tracking-tight">Deals /</span>
                    <h2 className="text-base font-bold tracking-tight text-gray-900">{form.name}</h2>
                    <Star size={16} className="text-gray-300 ml-1" />
                 </div>
              </div>
           </div>
           
           <div className="flex items-center gap-3">
              <button onClick={() => onDelete(deal.id)} className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all">
                <Trash2 size={18} />
              </button>
              {quotation ? (
                <button 
                  onClick={() => onEditQuotation?.(quotation.id)}
                  className="h-10 px-4 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-100 transition-all"
                >
                  <FileText size={14} /> EDIT PENAWARAN
                </button>
              ) : (
                onCreateQuotation && deal.client_id && (
                  <button 
                    onClick={() => onCreateQuotation(deal.client_id!, deal.id)}
                    className="h-10 px-4 bg-emerald-600 text-white rounded font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-sm"
                  >
                    <FileText size={14} /> BUAT PENAWARAN
                  </button>
                )
              )}
              <button 
                onClick={handleSave} 
                disabled={isProcessing}
                className="h-10 px-6 bg-gray-900 text-white rounded font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-black transition-all disabled:opacity-50"
              >
                 {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} UPDATE DEAL
              </button>
              <div className="w-px h-6 bg-gray-100 mx-1"></div>
              <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors">
                <X size={20} />
              </button>
           </div>
        </header>

        {/* METADATA BAR */}
        <div className="px-8 py-4 flex items-center justify-between border-b border-gray-50 bg-gray-50/30 shrink-0">
           <div className="flex items-center gap-6">
              <div className="px-2 py-0.5 border border-gray-200 rounded-sm text-[10px] font-bold text-gray-500 bg-white uppercase">
                 DEAL ID: {deal.id}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400">
                 <Clock size={14} /> Dibuat {new Date(deal.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
              </div>
              {quotation && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[9px] font-bold uppercase tracking-widest">
                  <FileText size={12} /> {quotation.number}
                </div>
              )}
           </div>
           <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expected Value:</span>
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
             <div className="flex items-center gap-2 mb-6 shrink-0">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Log Aktivitas Deal</h3>
             </div>

             <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-start gap-4 mb-8 shrink-0">
                   <div className="w-9 h-9 rounded bg-indigo-600 flex items-center justify-center font-bold text-white text-[10px] shrink-0 shadow-md shadow-indigo-100">
                      {user.full_name.charAt(0)}
                   </div>
                   <div className="flex-1 relative">
                      <textarea 
                         value={newComment}
                         onChange={e => setNewComment(e.target.value)}
                         placeholder="Tulis catatan perkembangan deal..."
                         className="w-full min-h-[80px] bg-gray-50 border border-gray-200 rounded-sm p-3 text-xs font-medium outline-none focus:bg-white focus:border-blue-400 transition-all resize-none"
                      />
                      <div className="absolute right-2 bottom-2">
                         <button 
                           onClick={handleAddComment}
                           disabled={!newComment.trim() || isProcessing}
                           className="p-1.5 bg-gray-900 text-white rounded hover:bg-black transition-all disabled:opacity-20"
                         >
                            <ArrowUp size={16} />
                         </button>
                      </div>
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-6">
                   {loadingActivities ? (
                      <div className="py-20 text-center text-gray-300 animate-pulse">Memuat Aktivitas...</div>
                   ) : activities.length === 0 ? (
                      <div className="py-20 text-center text-gray-300">
                         <MessageSquare size={32} className="mx-auto mb-2 opacity-10" />
                         <p className="text-[10px] font-bold uppercase tracking-widest">Belum ada aktivitas tercatat</p>
                      </div>
                   ) : (
                     activities.map((act, i) => (
                        <div key={act.id} className="relative flex gap-6">
                           {i < activities.length - 1 && <div className="absolute left-[17.5px] top-6 bottom-[-24px] w-px bg-gray-100"></div>}
                           <div className="relative shrink-0">
                              <div className="w-9 h-9 rounded border border-gray-200 bg-white flex items-center justify-center text-gray-400 z-10">
                                 {act.activity_type === 'status_change' ? <RefreshCw size={14} className="text-blue-500" /> : <MessageSquare size={14} />}
                              </div>
                           </div>
                           <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                 <span className="text-xs font-bold text-gray-900">{act.profiles?.full_name}</span>
                                 <span className="text-[9px] font-bold text-gray-300 uppercase">
                                    {new Date(act.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                                 </span>
                              </div>
                              <p className={`text-[12px] font-medium ${act.activity_type === 'status_change' ? 'text-gray-400 italic' : 'text-gray-600'}`}>
                                 {act.content}
                              </p>
                           </div>
                        </div>
                     ))
                   )}
                </div>
             </div>
          </div>

          {/* COLUMN RIGHT: DETAIL INFORMASI */}
          <div className="w-1/2 flex flex-col min-w-0">
             <div className="flex items-center gap-2 mb-6 shrink-0">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Informasi Transaksi</h3>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-6">
                
                {quotation && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-sm space-y-3 animate-in fade-in slide-in-from-top-2">
                     <div className="flex items-center justify-between">
                        <label className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Penawaran Terhubung</label>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-bold uppercase rounded">AKTIF</span>
                     </div>
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-white rounded flex items-center justify-center text-emerald-600 shadow-sm">
                              <FileText size={16} />
                           </div>
                           <span className="text-sm font-bold text-gray-900">{quotation.number}</span>
                        </div>
                        <button 
                           onClick={() => onEditQuotation?.(quotation.id)}
                           className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 transition-colors uppercase tracking-tight"
                        >
                           LIHAT DETAIL
                        </button>
                     </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-0.5">Nama Deal / Project</label>
                    <input 
                      type="text" 
                      value={form.name}
                      onChange={e => setForm({...form, name: e.target.value})}
                      className="w-full h-11 bg-gray-50 border border-gray-100 rounded-sm px-4 text-xs font-bold outline-none focus:bg-white focus:border-blue-400 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-0.5">Hubungkan Client</label>
                    <select 
                        value={form.client_id || ''}
                        onChange={e => handleClientChange(Number(e.target.value))}
                        className="w-full h-11 bg-gray-50 border border-gray-100 rounded-sm px-3 text-xs font-bold outline-none focus:bg-white focus:border-blue-400 transition-all cursor-pointer"
                    >
                        <option value="">-- Pilih Client --</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.salutation ? `${c.salutation} ` : ''}{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-0.5">Nilai Transaksi</label>
                      <div className="flex items-center h-11 bg-gray-50 border border-gray-100 rounded-sm overflow-hidden focus-within:bg-white focus-within:border-blue-400 transition-all">
                        <span className="px-3 text-[10px] font-bold text-gray-400 border-r border-gray-100 bg-gray-50/50">RP</span>
                        <input 
                          type="number" 
                          value={form.expected_value}
                          onChange={e => setForm({...form, expected_value: Number(e.target.value)})}
                          className="flex-1 px-3 bg-transparent border-none outline-none font-bold text-xs text-gray-900"
                          placeholder="0"
                        />
                      </div>
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-0.5">PIC Sales</label>
                      <div className="flex items-center h-11 bg-gray-50 border border-gray-100 rounded-sm overflow-hidden focus-within:bg-white focus-within:border-blue-400 transition-all">
                        <div className="px-3 text-gray-300">
                          <UserCircle size={14} />
                        </div>
                        <select 
                          value={form.sales_id}
                          onChange={e => setForm({...form, sales_id: e.target.value})}
                          className="flex-1 bg-transparent border-none outline-none font-bold text-[11px] text-gray-700 cursor-pointer"
                        >
                          {members.map(m => <option key={m.profile?.id} value={m.profile?.id}>{m.profile?.full_name}</option>)}
                        </select>
                      </div>
                   </div>
                </div>

                <div className="space-y-1.5">
                   <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-0.5">Catatan Deal</label>
                   <textarea 
                      value={form.notes || ''}
                      onChange={e => setForm({...form, notes: e.target.value})}
                      className="w-full min-h-[140px] bg-gray-50 border border-gray-100 rounded-sm p-4 text-xs font-medium outline-none focus:bg-white focus:border-blue-400 transition-all resize-none"
                      placeholder="Tambahkan instruksi khusus atau detail teknis mengenai transaksi ini..."
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
