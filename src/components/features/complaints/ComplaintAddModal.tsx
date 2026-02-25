import React, { useState } from 'react';
import { Input, Select, Textarea, Button, Modal } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { Company, CompanyMember, SupportStage, Client, SupportTicket, TicketTopic } from '@/lib/types';
import { Loader2, Save } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  members: CompanyMember[];
  stages: SupportStage[];
  clients: Client[];
  topics: TicketTopic[];
  onSuccess: () => void;
}

export const ComplaintAddModal: React.FC<Props> = ({ 
  isOpen, onClose, company, members, stages, clients, topics, onSuccess 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [form, setForm] = useState<Partial<SupportTicket>>({
    title: '',
    description: '',
    client_id: null,
    topic_id: null,
    assigned_id: members[0]?.user_id || '',
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
      setForm({ title: '', description: '', client_id: null, topic_id: null, assigned_id: members[0]?.user_id || '', status: stages[0]?.name.toLowerCase() || 'open', priority: 'high', type: 'complaint' });
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
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button 
            onClick={handleSave} 
            disabled={isProcessing} 
            isLoading={isProcessing}
            leftIcon={<Save size={14} />}
            variant="danger"
          >
            Simpan Complaint
          </Button>
        </div>
      }
    >
      <div className="space-y-6 py-2">
        <Input 
          label="Subjek Keluhan"
          type="text" 
          value={form.title} 
          onChange={e => setForm({...form, title: e.target.value})}
          placeholder="Misal: Pelayanan kurang memuaskan, Barang rusak..." 
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <Select 
             label="Client Terkait" 
             value={form.client_id || ''} 
             onChange={e => setForm({...form, client_id: Number(e.target.value)})}
             required
           >
             <option value="">-- Pilih Client --</option>
             {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
           </Select>

           <Select 
             label="PIC Penanganan" 
             value={form.assigned_id || ''} 
             onChange={e => setForm({...form, assigned_id: e.target.value})}
           >
             {members.map(m => <option key={m.user_id} value={m.user_id}>{m.profile?.full_name || 'Tanpa Nama'}</option>)}
           </Select>

           <Select 
             label="Topik Keluhan (Opsional)" 
             value={form.topic_id || ''} 
             onChange={e => setForm({...form, topic_id: e.target.value ? Number(e.target.value) : null})}
           >
             <option value="">-- Pilih Topik --</option>
             {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
           </Select>

           <Select 
             label="Prioritas" 
             value={form.priority} 
             onChange={e => setForm({...form, priority: e.target.value})}
           >
             <option value="low">Low</option>
             <option value="normal">Normal</option>
             <option value="high">High</option>
             <option value="urgent">Urgent</option>
           </Select>

           <Select 
             label="Status Awal" 
             value={form.status} 
             onChange={e => setForm({...form, status: e.target.value})}
           >
             {stages.map(s => <option key={s.id} value={s.name.toLowerCase()}>{s.name}</option>)}
           </Select>
        </div>

        <Textarea 
          label="Kronologi Keluhan"
          value={form.description || ''} 
          onChange={e => setForm({...form, description: e.target.value})}
          placeholder="Jelaskan kronologi keluhan pelanggan secara rinci..." 
          className="h-32"
        />
      </div>
    </Modal>
  );
};
