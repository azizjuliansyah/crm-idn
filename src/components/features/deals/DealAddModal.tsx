import React, { useState, useMemo } from 'react';
import { Input, Textarea, Button, Subtext, Label, SectionHeader, Modal, ComboBox, H4, ToastType } from '@/components/ui';

import { supabase } from '@/lib/supabase';
import { Deal, Company, CompanyMember, Pipeline, Client, ClientCompany, ClientCompanyCategory } from '@/lib/types';
import {
  Plus, Building, Target, User, FileText, Save, X,
  Contact2, CheckCircle2, Mail, Check as CheckIcon, Wallet
} from 'lucide-react';
import { ClientFormModal } from '@/components/features/clients/components/ClientFormModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  user: any;
  members: CompanyMember[];
  pipeline: Pipeline | null;
  clients: Client[];
  clientCompanies: ClientCompany[];
  categories: ClientCompanyCategory[];
  onSuccess: () => void;
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  setClientCompanies: React.Dispatch<React.SetStateAction<ClientCompany[]>>;
  setCategories: React.Dispatch<React.SetStateAction<ClientCompanyCategory[]>>;
  setToast: React.Dispatch<React.SetStateAction<{ isOpen: boolean; message: string; type: ToastType }>>;
}

export const DealAddModal: React.FC<Props> = ({
  isOpen, onClose, company, user, members, pipeline, clients, clientCompanies,
  categories, onSuccess, setClients, setClientCompanies, setCategories, setToast
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingQuick, setIsProcessingQuick] = useState(false);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClient, setNewClient] = useState<Partial<Client>>({ salutation: '', name: '', email: '', whatsapp: '', client_company_id: null });

  // Error states for validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<Partial<Deal>>({
    name: '', client_id: undefined, customer_company: '', contact_name: '',
    whatsapp: '', email: '', expected_value: 0, probability: 0, sales_id: user.id,
    source: 'Manual Deal', notes: '', stage_id: pipeline?.stages?.[0]?.id || '',
    input_date: new Date().toISOString().split('T')[0]
  });

  const handleQuickAddCategory = async (name: string) => {
    const { data, error } = await supabase
      .from('client_company_categories')
      .insert({ name: name.trim(), company_id: company.id })
      .select()
      .single();
    if (error) throw error;
    setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
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

      const freshClientsRes = await supabase.from('clients').select('*').eq('company_id', company.id).order('name');
      if (freshClientsRes.data) setClients(freshClientsRes.data);

      const co = clientCompanies.find(cc => cc.id === data.client_company_id);
      setForm(prev => ({
        ...prev,
        client_id: data.id,
        contact_name: data.name,
        customer_company: co ? co.name : 'Perorangan',
        email: data.email,
        whatsapp: data.whatsapp
      }));
      // Clear client-specific error if any
      setErrors(prev => {
        const next = { ...prev };
        delete next.client_id;
        return next;
      });
      setIsAddingClient(false);
      setNewClient({ salutation: '', name: '', email: '', whatsapp: '', client_company_id: null });
    } catch (err: any) {
      setToast({ isOpen: true, message: "Gagal menambah client: " + err.message, type: 'error' });
    } finally {
      setIsProcessingQuick(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name?.trim()) newErrors.name = 'Nama Deal wajib diisi';
    if (!form.client_id) newErrors.client_id = 'Client wajib dipilih atau dibuat baru';
    if (!pipeline) newErrors.pipeline = 'Pipeline tidak ditemukan';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !pipeline) return;

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
        notes: form.notes,
        stage_id: form.stage_id || pipeline.stages?.[0]?.id,
        company_id: company.id,
        pipeline_id: pipeline.id,
        source: form.source,
        input_date: form.input_date
      };
      await supabase.from('deals').insert(dealData);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
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
      // Clear error
      setErrors(prev => {
        const next = { ...prev };
        delete next.client_id;
        return next;
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Daftarkan Transaksi Baru"
      size="lg"
      footer={
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} isLoading={isProcessing} leftIcon={<Save size={14} />} className="rounded-md">
            Simpan Transaksi
          </Button>
        </div>
      }
    >
      <div className="space-y-8 pb-4">
        <div className="space-y-4">
          <SectionHeader
            icon={<Target size={16} />}
            title="Identitas Transaksi"
            className="pb-2 border-b border-gray-50 mb-4"
          />
          <Input
            label="Tanggal Input"
            type="date"
            value={form.input_date || ''}
            onChange={e => setForm({ ...form, input_date: e.target.value })}
            className="rounded-md"
          />
          <Input
            label="Nama Project / Deal*"
            value={form.name}
            onChange={e => {
              setForm({ ...form, name: e.target.value });
              if (errors.name) setErrors(prev => { const n = { ...prev }; delete n.name; return n; });
            }}
            error={errors.name}
            placeholder="Misal: Proyek Pengadaan Kursi 2025"
            className="rounded-md"
          />
        </div>

        <div className="space-y-5">
          <SectionHeader
            icon={<User size={16} />}
            title="Data Client Utama"
            className="pb-2 border-b border-gray-50 mb-5"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <ComboBox
                label="Pilih Client*"
                placeholder="Pilih Client Terdaftar"
                value={form.client_id ?? undefined}
                onChange={(val: string | number) => handleClientChange(Number(val))}
                options={clients.map(c => ({
                  value: c.id,
                  label: c.name,
                  sublabel: clientCompanies.find(cc => cc.id === c.client_company_id)?.name || 'PERORANGAN'
                }))}
                error={errors.client_id}
                onAddNew={() => setIsAddingClient(true)}
                leftIcon={<User size={16} />}
              />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <SectionHeader
            icon={<Wallet size={16} />}
            title="Penilaian Finansial"
            className="pb-2 border-b border-gray-50 mb-5"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Input
              label="Nilai Proyeksi (IDR)"
              type="number"
              value={form.expected_value}
              onChange={e => setForm({ ...form, expected_value: Number(e.target.value) })}
              leftIcon={<Label className="text-[11px] text-indigo-500">Rp</Label>}
              placeholder="0"
              className="rounded-md"
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
            <ComboBox
              label="Penanggung Jawab (Sales)"
              value={form.sales_id || ''}
              onChange={(val: string | number) => setForm({ ...form, sales_id: val.toString() })}
              options={members.map(m => ({ value: m.user_id.toString(), label: m.profile?.full_name || 'Tanpa Nama' }))}
            />
          </div>
        </div>

        <div className="space-y-3">
          <SectionHeader
            icon={<FileText size={16} />}
            title="Detail & Keterangan"
            className="mb-3"
          />
          <Textarea
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Tambahkan catatan strategis atau instruksi khusus untuk tim penangan deal ini..."
            className="h-32 rounded-md"
          />
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
