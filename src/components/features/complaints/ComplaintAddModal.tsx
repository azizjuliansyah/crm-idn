import React, { useState, useEffect } from 'react';
import { Input, Textarea, Button, Modal, ComboBox, Label, H4, ToastType } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { Company, CompanyMember, SupportStage, Client, SupportTicket, TicketTopic, ClientCompany, ClientCompanyCategory } from '@/lib/types';
import { Loader2, Save, X, Check } from 'lucide-react';
import { ClientFormModal } from '@/components/features/clients/components/ClientFormModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  members: CompanyMember[];
  stages: SupportStage[];
  clients: Client[];
  topics: TicketTopic[];
  onSuccess: () => void;
  setToast: (toast: { isOpen: boolean; message: string; type: ToastType }) => void;
}

export const ComplaintAddModal: React.FC<Props> = ({
  isOpen, onClose, company, members, stages, clients, topics, onSuccess, setToast
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

  // Quick Add Client State
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClientForm, setNewClientForm] = useState<Partial<Client>>({
    salutation: '',
    name: '',
    email: '',
    whatsapp: '',
    client_company_id: null
  });
  const [isProcessingQuick, setIsProcessingQuick] = useState(false);

  // Quick Add Topic State
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');

  // Data for quick add
  const [clientCompanies, setClientCompanies] = useState<ClientCompany[]>([]);
  const [categories, setCategories] = useState<ClientCompanyCategory[]>([]);

  useEffect(() => {
    if (isOpen) {
      const fetchQuickAddData = async () => {
        const [coRes, catRes] = await Promise.all([
          supabase.from('client_companies').select('*').eq('company_id', company.id).order('name'),
          supabase.from('client_company_categories').select('*').eq('company_id', company.id).order('name')
        ]);
        if (coRes.data) setClientCompanies(coRes.data);
        if (catRes.data) setCategories(catRes.data);
      };
      fetchQuickAddData();
    }
  }, [isOpen, company.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.client_id) {
      setToast({ isOpen: true, message: "Judul keluhan dan Client wajib diisi.", type: 'error' });
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase.from('support_tickets').insert({
        ...form,
        company_id: company.id
      });
      onSuccess();
      onClose();
      setToast({ isOpen: true, message: 'Keluhan baru telah didaftarkan.', type: 'success' });
      setForm({ title: '', description: '', client_id: null, topic_id: null, assigned_id: members[0]?.user_id || '', status: stages[0]?.name.toLowerCase() || 'open', priority: 'high', type: 'complaint' });
    } catch (err: any) {
      setToast({ isOpen: true, message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickAddClient = async (f: Partial<Client>) => {
    if (!f.name?.trim()) return;
    setIsProcessingQuick(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          ...f,
          company_id: company.id,
          whatsapp: f.whatsapp ? `+62${f.whatsapp.replace(/\\D/g, '')}` : null
        })
        .select()
        .single();
      if (error) throw error;
      setForm((prev: any) => ({ ...prev, client_id: data.id }));
      setIsAddingClient(false);
      setNewClientForm({ salutation: '', name: '', email: '', whatsapp: '', client_company_id: null });
      setToast({ isOpen: true, message: 'Client baru berhasil ditambahkan!', type: 'success' });
      onSuccess(); // Refresh clients in parent
    } catch (err: any) {
      setToast({ isOpen: true, message: "Gagal menambah client: " + err.message, type: 'error' });
    } finally {
      setIsProcessingQuick(false);
    }
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
    setClientCompanies((prev: ClientCompany[]) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
  };

  const handleQuickAddTopic = async () => {
    if (!newTopicName.trim()) return;
    try {
      const { data, error } = await supabase
        .from('ticket_topics')
        .insert({ name: newTopicName, company_id: company.id })
        .select()
        .single();

      if (error) throw error;
      onSuccess(); // Refresh topics in parent
      setForm({ ...form, topic_id: data.id });
      setNewTopicName('');
      setIsAddingTopic(false);
      setToast({ isOpen: true, message: 'Topik baru berhasil ditambahkan!', type: 'success' });
    } catch (err: any) {
      setToast({ isOpen: true, message: err.message, type: 'error' });
    }
  };

  const handleQuickAddCategory = async (name: string) => {
    const { data, error } = await supabase
      .from('client_company_categories')
      .insert({ name: name.trim(), company_id: company.id })
      .select()
      .single();
    if (error) throw error;
    setCategories((prev: ClientCompanyCategory[]) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Daftarkan Keluhan Client"
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="ghost" onClick={onClose} disabled={isProcessing} className="rounded-md">
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isProcessing}
            isLoading={isProcessing}
            leftIcon={<Save size={14} />}
            className="rounded-md"
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
          onChange={e => setForm({ ...form, title: e.target.value })}
          placeholder="Misal: Pelayanan kurang memuaskan, Barang rusak..."
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ComboBox
            label="Client Terkait*"
            value={form.client_id || ''}
            onChange={(val: string | number) => setForm({ ...form, client_id: Number(val) })}
            options={clients.map(c => ({
              value: c.id.toString(),
              label: c.name,
              sublabel: `${c.salutation || ''} ${c.whatsapp || c.email || ''}`.trim()
            }))}
            className="rounded-md"
            onAddNew={() => setIsAddingClient(true)}
            addNewLabel="Tambah Client Baru"
          />



          <ComboBox
            label="PIC Penanganan"
            value={form.assigned_id || ''}
            onChange={(val: string | number) => setForm({ ...form, assigned_id: val.toString() })}
            options={members.map(m => ({ value: m.user_id.toString(), label: m.profile?.full_name || 'Tanpa Nama' }))}
          />

          <div className="space-y-1.5">
            {isAddingTopic ? (
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-[9px] text-gray-400 uppercase ml-1">Topik Baru*</Label>
                  <Input
                    autoFocus
                    type="text"
                    value={newTopicName}
                    onChange={e => setNewTopicName(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-rose-100 rounded-lg text-xs outline-none h-[42px]"
                    placeholder="Nama Topik..."
                  />
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    onClick={handleQuickAddTopic}
                    disabled={!newTopicName.trim()}
                    className="!px-3 bg-rose-600 text-white rounded-lg h-[42px]"
                    variant="danger"
                  >
                    <Check size={14} />
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setIsAddingTopic(false)}
                    className="!px-3 bg-gray-100 text-gray-400 rounded-lg h-[42px]"
                    variant="secondary"
                  >
                    <X size={14} />
                  </Button>
                </div>
              </div>
            ) : (
              <ComboBox
                label="Topik Keluhan (Opsional)"
                value={form.topic_id || ''}
                onChange={(val: string | number) => setForm({ ...form, topic_id: val ? Number(val) : null })}
                options={topics.map(t => ({ value: t.id.toString(), label: t.name }))}
                onAddNew={() => setIsAddingTopic(true)}
                addNewLabel="Tambah Topik Baru"
                className="rounded-md"
              />
            )}
          </div>

          <ComboBox
            label="Prioritas"
            value={form.priority || 'high'}
            onChange={(val: string | number) => setForm({ ...form, priority: val.toString() })}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'normal', label: 'Normal' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' },
            ]}
          />

          <ComboBox
            label="Status Awal"
            value={form.status || ''}
            onChange={(val: string | number) => setForm({ ...form, status: val.toString() })}
            options={stages.map(s => ({ value: s.name.toLowerCase(), label: s.name }))}
          />
        </div>

        <Textarea
          label="Kronologi Keluhan"
          value={form.description || ''}
          onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Jelaskan kronologi keluhan pelanggan secara rinci..."
          className="h-32"
        />
      </div>
      <ClientFormModal
        isOpen={isAddingClient}
        onClose={() => setIsAddingClient(false)}
        onSave={handleQuickAddClient}
        form={newClientForm}
        setForm={setNewClientForm}
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
