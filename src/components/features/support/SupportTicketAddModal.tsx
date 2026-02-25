import React, { useState } from 'react';
import { Input, Select, Textarea, Button, Modal } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { Company, CompanyMember, SupportStage, Client, SupportTicket, TicketTopic } from '@/lib/types';
import { Loader2, Save, ChevronDown, Layers } from 'lucide-react';

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

export const SupportTicketAddModal: React.FC<Props> = ({
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
      setForm({ title: '', description: '', client_id: null, topic_id: null, assigned_id: members[0]?.user_id || '', status: stages[0]?.name.toLowerCase() || 'open', priority: 'normal', type: 'ticket' });
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
        <div className="flex w-full gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1  text-xs uppercase tracking-tight">Batal</Button>
          <Button
            onClick={handleSave}
            isLoading={isProcessing}
            leftIcon={<Save size={14} />}
            variant="danger"
            className="flex-1  text-xs uppercase tracking-tight shadow-lg shadow-rose-100"
          >
            Buat Ticket
          </Button>
        </div>
      }
    >
      <div className="space-y-8 py-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Kategori Tipe*"
            value={form.type}
            onChange={e => setForm({ ...form, type: e.target.value as any })}
            required
          >
            <option value="ticket">Standard Ticket (Support)</option>
            <option value="complaint">Complaint (Keluhan)</option>
          </Select>

          <Input
            label="Masalah / Judul Ticket*"
            type="text"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Misal: Gangguan Akses Login..."
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Pilih Client Terdaftar*"
            value={form.client_id || ''}
            onChange={e => setForm({ ...form, client_id: Number(e.target.value) })}
            required
          >
            <option value="">-- Pilih Client --</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>

          <Select
            label="Assign ke Tim Support"
            value={form.assigned_id || ''}
            onChange={e => setForm({ ...form, assigned_id: e.target.value })}
          >
            {members.map(m => <option key={m.user_id} value={m.user_id}>{m.profile?.full_name || 'Tanpa Nama'}</option>)}
          </Select>

          <Select
            label="Topik Tiket (Opsional)"
            value={form.topic_id || ''}
            onChange={e => setForm({ ...form, topic_id: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">-- Pilih Topik --</option>
            {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>

          <Select
            label="Prioritas"
            value={form.priority}
            onChange={e => setForm({ ...form, priority: e.target.value })}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>

          <Select
            label="Status Awal"
            value={form.status}
            onChange={e => setForm({ ...form, status: e.target.value })}
          >
            {stages.map(s => <option key={s.id} value={s.name.toLowerCase()}>{s.name}</option>)}
          </Select>
        </div>

        <Textarea
          label="Detail Deskripsi Masalah"
          value={form.description || ''}
          onChange={e => setForm({ ...form, description: e.target.value })}
          className="h-32"
          placeholder="Tuliskan kendala yang dialami client secara detail..."
        />
      </div>
    </Modal>
  );
};
