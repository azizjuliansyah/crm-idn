
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Lead, Profile, Company, CompanyMember, LeadActivity, LeadStage, LeadSource, ClientCompany } from '@/lib/types';
import { 
  ChevronLeft, Target, Star, Trash2, Loader2, Save, X, Activity, 
  ArrowUp, MessageSquare, RefreshCw, Pencil, List, Building, 
  ArrowRightLeft, Clock, User, Mail,
  CheckCircle2, DollarSign
} from 'lucide-react';
import { Modal } from './Modal';

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
        .select('*, profiles(*)')
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
        {/* HEADER SECTION - PROFESSIONAL & SHARP */}
        <header className="px-6 h-16 flex items-center justify-between border-b border-gray-100 bg-white shrink-0">
           <div className="flex items-center gap-4">
              <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors border border-transparent hover:border-gray-100 rounded">
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded bg-rose-600 text-white flex items-center justify-center">
                    <Target size={18} />
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-gray-400 font-medium text-sm tracking-tight">Leads /</span>
                    <h2 className="text-base font-bold tracking-tight text-gray-900">{form.name}</h2>
                    <Star size={16} className="text-gray-300 ml-1" />
                 </div>
              </div>
           </div>
           
           <div className="flex items-center gap-3">
              <button onClick={() => onDelete(lead.id)} className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all">
                <Trash2 size={18} />
              </button>
              {isQualified && (
                <button 
                  onClick={onConvertToDeal}
                  className="h-10 px-4 bg-emerald-600 text-white rounded font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-sm"
                >
                  <ArrowRightLeft size={14} /> JADI DEAL
                </button>
              )}
              <button 
                onClick={handleSave} 
                disabled={isProcessing}
                className="h-10 px-6 bg-gray-900 text-white rounded font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-black transition-all disabled:opacity-50"
              >
                 {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} SIMPAN
              </button>
              <div className="w-px h-6 bg-gray-100 mx-1"></div>
              <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors">
                <X size={20} />
              </button>
           </div>
        </header>

        {/* METADATA BAR - MINIMALIST */}
        <div className="px-8 py-4 flex items-center justify-between border-b border-gray-50 bg-gray-50/30 shrink-0">
           <div className="flex items-center gap-6">
              <div className="px-2 py-0.5 border border-gray-200 rounded-sm text-[10px] font-bold text-gray-500 bg-white">
                 ID: {lead.id}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400">
                 <Clock size={14} /> Dibuat 0 hari lalu
              </div>
           </div>
           <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expected:</span>
              <span className="text-sm font-bold text-blue-600">{formatIDR(form.expected_value)}</span>
           </div>
        </div>

        {/* STEPPER STATUS - SHARP CHEVRON */}
        <div className="px-8 pt-6 pb-2 shrink-0">
           <div className="flex items-center h-10 w-full overflow-hidden rounded-sm border border-gray-200">
              {stages.map((stage, idx) => {
                const isActive = form.status?.toLowerCase() === stage.name.toLowerCase();
                const isLast = idx === stages.length - 1;
                const isFirst = idx === 0;
                
                let bgColor = 'bg-white text-gray-400 hover:bg-gray-50';
                let borderColor = 'border-gray-100';
                
                if (isActive) {
                   if (stage.name.toLowerCase() === 'qualified') bgColor = 'bg-emerald-600 text-white';
                   else if (stage.name.toLowerCase() === 'unqualified') bgColor = 'bg-gray-400 text-white';
                   else bgColor = 'bg-blue-600 text-white';
                   borderColor = 'border-transparent';
                }

                return (
                  <button 
                    key={stage.id}
                    onClick={() => handleStatusChange(stage.name)}
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

        {/* MAIN CONTENT - TWO COLUMN GRID */}
        <div className="flex-1 flex overflow-hidden px-8 py-6 gap-10">
          
          {/* COLUMN LEFT: LOG AKTIVITAS (TIMELINE) */}
          <div className="w-1/2 flex flex-col min-w-0 border-r border-gray-100 pr-10">
             <div className="flex items-center gap-2 mb-6 shrink-0">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Log Aktivitas</h3>
             </div>

             <div className="flex-1 flex flex-col overflow-hidden">
                {/* Input Komentar Baru */}
                <div className="flex items-start gap-4 mb-8 shrink-0">
                   <div className="w-9 h-9 rounded bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-xs shrink-0">
                      {user.full_name.charAt(0)}
                   </div>
                   <div className="flex-1 relative">
                      <textarea 
                         value={newComment}
                         onChange={e => setNewComment(e.target.value)}
                         placeholder="Tulis update progres..."
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

                {/* Daftar Aktivitas */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-6">
                   {activities.length === 0 ? (
                      <div className="py-20 text-center text-gray-300">
                         <MessageSquare size={32} className="mx-auto mb-2 opacity-20" />
                         <p className="text-[10px] font-bold uppercase tracking-widest">Belum ada aktivitas</p>
                      </div>
                   ) : (
                     activities.map((act, i) => (
                        <div key={act.id} className="relative flex gap-6">
                           {i < activities.length - 1 && <div className="absolute left-[17.5px] top-6 bottom-[-24px] w-px bg-gray-100"></div>}
                           <div className="relative shrink-0">
                              <div className="w-9 h-9 rounded border border-gray-200 bg-white flex items-center justify-center text-gray-400 z-10">
                                 {act.activity_type === 'status_change' ? <RefreshCw size={14} className="text-blue-500" /> : <Pencil size={14} />}
                              </div>
                           </div>
                           <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                 <span className="text-xs font-bold text-gray-900">{act.profiles?.full_name}</span>
                                 <span className="text-[9px] font-bold text-gray-300 uppercase">
                                    {new Date(act.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                                 </span>
                              </div>
                              <p className={`text-[12px] leading-relaxed font-medium ${act.activity_type === 'status_change' ? 'text-gray-400 italic' : 'text-gray-600'}`}>
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
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Detail Informasi</h3>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-6">
                <div className="grid grid-cols-3 gap-4">
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-0.5">Sapaan</label>
                      <select 
                        value={form.salutation} 
                        onChange={e => setForm({...form, salutation: e.target.value})}
                        className="w-full h-10 bg-gray-50 border border-gray-200 rounded-sm px-3 text-xs font-bold outline-none focus:bg-white focus:border-blue-400 transition-all"
                      >
                         <option value="-">-</option>
                         <option value="Bapak">Bapak</option>
                         <option value="Ibu">Ibu</option>
                      </select>
                   </div>
                   <div className="col-span-2 space-y-1.5">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-0.5">Nama Lengkap</label>
                      <input 
                        type="text" 
                        value={form.name}
                        onChange={e => setForm({...form, name: e.target.value})}
                        className="w-full h-10 bg-gray-50 border border-gray-200 rounded-sm px-4 text-xs font-bold outline-none focus:bg-white focus:border-blue-400 transition-all"
                      />
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-0.5">WhatsApp</label>
                      <div className="flex h-10 bg-gray-50 border border-gray-200 rounded-sm overflow-hidden focus-within:bg-white focus-within:border-blue-400 transition-all">
                         <div className="px-3 bg-gray-100/50 text-[10px] font-bold text-gray-400 border-r border-gray-200 flex items-center">+62</div>
                         <input 
                           type="tel" 
                           value={waNumber}
                           onChange={e => handleWaNumberChange(e.target.value)}
                           className="flex-1 px-3 text-xs font-bold outline-none bg-transparent"
                         />
                      </div>
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-0.5">Email</label>
                      <input 
                        type="email" 
                        value={form.email}
                        onChange={e => setForm({...form, email: e.target.value})}
                        className="w-full h-10 bg-gray-50 border border-gray-200 rounded-sm px-4 text-xs font-bold outline-none focus:bg-white focus:border-blue-400 transition-all"
                      />
                   </div>
                </div>

                <div className="p-5 bg-blue-50/40 border border-blue-100 rounded-sm space-y-3">
                   <label className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">Nilai Proyeksi (IDR)</label>
                   <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-blue-400 bg-white px-2 py-0.5 border border-blue-100 rounded-sm">RP</span>
                      <input 
                        type="number" 
                        value={form.expected_value}
                        onChange={e => setForm({...form, expected_value: Number(e.target.value)})}
                        className="bg-transparent border-none outline-none font-bold text-xl text-gray-900 w-full"
                        placeholder="0"
                      />
                   </div>
                </div>

                <div className="space-y-1.5">
                   <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-0.5">Instansi / Perusahaan</label>
                   <select 
                      value={form.client_company_id || ''}
                      onChange={e => setForm({...form, client_company_id: e.target.value ? Number(e.target.value) : null})}
                      className="w-full h-10 bg-gray-50 border border-gray-200 rounded-sm px-3 text-xs font-bold outline-none focus:bg-white focus:border-blue-400 transition-all"
                   >
                      <option value="">Personal / Individual</option>
                      {clientCompanies.map(co => <option key={co.id} value={co.id}>{co.name}</option>)}
                   </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-0.5">Sumber Lead</label>
                      <select 
                        value={form.source}
                        onChange={e => setForm({...form, source: e.target.value})}
                        className="w-full h-10 bg-gray-50 border border-gray-200 rounded-sm px-3 text-xs font-bold outline-none focus:bg-white focus:border-blue-400 transition-all"
                      >
                         {sources.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-0.5">PIC Sales</label>
                      <select 
                        value={form.sales_id}
                        onChange={e => setForm({...form, sales_id: e.target.value})}
                        className="w-full h-10 bg-gray-50 border border-gray-200 rounded-sm px-3 text-xs font-bold outline-none focus:bg-white focus:border-blue-400 transition-all"
                      >
                         {members.map(m => <option key={m.profile?.id} value={m.profile?.id}>{m.profile?.full_name}</option>)}
                      </select>
                   </div>
                </div>

                <div className="space-y-1.5">
                   <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-0.5">Alamat / Lokasi</label>
                   <textarea 
                      value={form.address || ''}
                      onChange={e => setForm({...form, address: e.target.value})}
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
