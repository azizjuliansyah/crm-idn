import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, CompanyMember, SupportStage, Client, SupportTicket } from '@/lib/types';
import { Loader2, Save, ChevronDown, Layers } from 'lucide-react';
import { Modal } from '@/components/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  members: CompanyMember[];
  stages: SupportStage[];
  clients: Client[];
  onSuccess: () => void;
}

export const SupportTicketAddModal: React.FC<Props> = ({ 
  isOpen, onClose, company, members, stages, clients, onSuccess 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [form, setForm] = useState<Partial<SupportTicket>>({
    title: '',
    description: '',
    client_id: null,
    assigned_id: members[0]?.profile?.id || '',
    status: stages[0]?.name.toLowerCase() || 'open',
    priority: 'normal',
    type: 'ticket'
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.client_id) {
        alert("Judul ticket dan Client wajib diisi.");
        return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase.from('support_tickets').insert({
        ...form,
        company_id: company.id
      });
      if (error) throw error;
      onSuccess();
      onClose();
      setForm({ title: '', description: '', client_id: null, assigned_id: members[0]?.profile?.id || '', status: stages[0]?.name.toLowerCase() || 'open', priority: 'normal', type: 'ticket' });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Daftarkan Ticket Bantuan"
      size="lg"
      footer={
        <div className="flex gap-3">
          <button onClick={onClose} className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Batal</button>
          <button onClick={handleSave} disabled={isProcessing} className="px-10 py-3.5 bg-rose-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 active:scale-95">
            {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Buat Ticket
          </button>
        </div>
      }
    >
      <div className="space-y-8 py-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Kategori Tipe*</label>
            <div className="relative">
              <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
              <select 
                value={form.type} 
                onChange={e => setForm({...form, type: e.target.value as any})} 
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none cursor-pointer focus:bg-white transition-all shadow-inner appearance-none"
              >
                <option value="ticket">Standard Ticket (Support)</option>
                <option value="complaint">Complaint (Keluhan)</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={14} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Masalah / Judul Ticket*</label>
            <input 
              type="text" 
              value={form.title} 
              onChange={e => setForm({...form, title: e.target.value})}
              className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:bg-white focus:border-rose-500 transition-all shadow-inner" 
              placeholder="Misal: Gangguan Akses Login..." 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Pilih Client Terdaftar*</label>
              <select value={form.client_id || ''} onChange={e => setForm({...form, client_id: Number(e.target.value)})} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none cursor-pointer focus:bg-white transition-all">
                <option value="">-- Pilih Client --</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Assign ke Tim Support</label>
              <select value={form.assigned_id || ''} onChange={e => setForm({...form, assigned_id: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none cursor-pointer focus:bg-white transition-all">
                {members.map(m => m.profile && <option key={m.profile.id} value={m.profile.id}>{m.profile.full_name}</option>)}
              </select>
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Prioritas</label>
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none cursor-pointer focus:bg-white">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Status Awal</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none cursor-pointer focus:bg-white">
                {stages.map(s => <option key={s.id} value={s.name.toLowerCase()}>{s.name}</option>)}
              </select>
           </div>
        </div>

        <div className="space-y-4">
           <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Detail Deskripsi Masalah</label>
           <textarea 
            value={form.description || ''} 
            onChange={e => setForm({...form, description: e.target.value})}
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-5 text-xs font-medium h-32 resize-none outline-none focus:bg-white focus:border-rose-500 transition-all shadow-inner" 
            placeholder="Tuliskan kendala yang dialami client secara detail..." 
           />
        </div>
      </div>
    </Modal>
  );
};
