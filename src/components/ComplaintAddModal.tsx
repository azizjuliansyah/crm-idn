import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, CompanyMember, SupportStage, Client, SupportTicket } from '@/lib/types';
import { Loader2, Save } from 'lucide-react';
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

export const ComplaintAddModal: React.FC<Props> = ({ 
  isOpen, onClose, company, members, stages, clients, onSuccess 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [form, setForm] = useState<Partial<SupportTicket>>({
    title: '',
    description: '',
    client_id: null,
    assigned_id: members[0]?.profile?.id || '',
    status: stages[0]?.name.toLowerCase() || 'open',
    priority: 'high',
    type: 'complaint'
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.client_id) {
        alert("Judul keluhan dan Client wajib diisi.");
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
      setForm({ title: '', description: '', client_id: null, assigned_id: members[0]?.profile?.id || '', status: stages[0]?.name.toLowerCase() || 'open', priority: 'high', type: 'complaint' });
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
      title="Daftarkan Keluhan Client"
      size="lg"
      footer={
        <div className="flex gap-3">
          <button onClick={onClose} className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Batal</button>
          <button onClick={handleSave} disabled={isProcessing} className="px-10 py-3.5 bg-rose-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 active:scale-95">
            {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Simpan Complaint
          </button>
        </div>
      }
    >
      <div className="space-y-8 py-2">
        <div className="space-y-4">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Subjek Keluhan*</label>
          <input 
            type="text" 
            value={form.title} 
            onChange={e => setForm({...form, title: e.target.value})}
            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:bg-white focus:border-rose-500 transition-all shadow-inner" 
            placeholder="Misal: Pelayanan kurang memuaskan, Barang rusak..." 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Client Terkait*</label>
              <select value={form.client_id || ''} onChange={e => setForm({...form, client_id: Number(e.target.value)})} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none cursor-pointer focus:bg-white transition-all">
                <option value="">-- Pilih Client --</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">PIC Penanganan</label>
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
           <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Kronologi Keluhan</label>
           <textarea 
            value={form.description || ''} 
            onChange={e => setForm({...form, description: e.target.value})}
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-5 text-xs font-medium h-32 resize-none outline-none focus:bg-white focus:border-rose-500 transition-all shadow-inner" 
            placeholder="Jelaskan kronologi keluhan pelanggan secara rinci..." 
           />
        </div>
      </div>
    </Modal>
  );
};
