import React, { useState, useMemo } from 'react';
import { Input, Select, Textarea, Button, Subtext, Label, SectionHeader, Modal, ComboBox, H4 } from '@/components/ui';

import { supabase } from '@/lib/supabase';
import { Deal, Company, CompanyMember, Pipeline, Client, ClientCompany, ClientCompanyCategory } from '@/lib/types';
import {
  Plus, Building, Target, User, FileText, Save, X,
  Contact2, CheckCircle2, Mail, Check as CheckIcon, Wallet
} from 'lucide-react';

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
}

export const DealAddModal: React.FC<Props> = ({
  isOpen, onClose, company, user, members, pipeline, clients, clientCompanies,
  categories, onSuccess, setClients, setClientCompanies, setCategories
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClient, setNewClient] = useState({ salutation: '', name: '', email: '', whatsapp: '', client_company_id: null as number | null });
  const [waNumber, setWaNumber] = useState('');
  const [isAddingCo, setIsAddingCo] = useState(false);
  const [newCo, setNewCo] = useState({ name: '', category_id: '', address: '' });
  const [coProcessing, setCoProcessing] = useState(false);
  const [isAddingCatInCo, setIsAddingCatInCo] = useState(false);
  const [newCatInCoName, setNewCatInCoName] = useState('');

  // Error states for validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<Partial<Deal>>({
    name: '', client_id: undefined, customer_company: '', contact_name: '',
    whatsapp: '', email: '', expected_value: 0, probability: 0, sales_id: user.id,
    source: 'Manual Deal', notes: '', stage_id: pipeline?.stages?.[0]?.id || '',
    input_date: new Date().toISOString().split('T')[0]
  });

  const handleWaNumberChange = (val: string) => {
    let cleaned = val.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    if (cleaned.startsWith('62')) cleaned = cleaned.substring(2);
    setWaNumber(cleaned);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name?.trim()) newErrors.name = 'Nama Deal wajib diisi';
    if (!form.client_id) newErrors.client_id = 'Client wajib dipilih atau dibuat baru';
    if (!pipeline) newErrors.pipeline = 'Pipeline tidak ditemukan';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleQuickAddCatInCo = async () => {
    if (!newCatInCoName.trim()) return;
    try {
      const { data, error } = await supabase
        .from('client_company_categories')
        .insert({ name: newCatInCoName.trim(), company_id: company.id })
        .select()
        .single();
      if (error) throw error;
      setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCo(prev => ({ ...prev, category_id: String(data.id) }));
      setNewCatInCoName('');
      setIsAddingCatInCo(false);
    } catch (err: any) {
      alert("Gagal menambah kategori: " + err.message);
    }
  };

  const handleQuickAddCo = async () => {
    if (!newCo.name.trim() || !newCo.category_id || !newCo.address.trim()) {
      alert("Nama, Kategori, dan Alamat Perusahaan wajib diisi.");
      return;
    }
    setCoProcessing(true);
    try {
      const { data, error } = await supabase
        .from('client_companies')
        .insert({
          name: newCo.name.trim(),
          category_id: parseInt(newCo.category_id),
          address: newCo.address.trim(),
          company_id: company.id
        })
        .select('*')
        .single();
      if (error) throw error;
      setClientCompanies(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewClient(prev => ({ ...prev, client_company_id: data.id }));
      setIsAddingCo(false);
      setNewCo({ name: '', category_id: '', address: '' });
    } catch (err: any) {
      alert("Gagal menambah perusahaan: " + err.message);
    } finally {
      setCoProcessing(false);
    }
  };

  const handleQuickAddClient = async () => {
    if (!newClient.name.trim()) {
      alert("Nama Client wajib diisi.");
      return;
    }
    setIsProcessing(true);
    try {
      const fullWa = waNumber ? `+62${waNumber}` : '';
      const { data, error } = await supabase
        .from('clients')
        .insert({
          company_id: company.id,
          salutation: newClient.salutation,
          name: newClient.name,
          client_company_id: newClient.client_company_id,
          email: newClient.email,
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
      setWaNumber('');
    } catch (err: any) {
      alert("Gagal menambah client: " + err.message);
    } finally {
      setIsProcessing(false);
    }
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
          {isAddingClient ? (
            <React.Fragment>
              <Button variant="ghost" onClick={() => setIsAddingClient(false)} className="px-6 text-gray-400">Batal</Button>
              <Button onClick={handleQuickAddClient} isLoading={isProcessing} leftIcon={<CheckCircle2 size={14} />} variant="success" className="rounded-md">
                Simpan & Pilih Client
              </Button>
            </React.Fragment>
          ) : (
            <Button onClick={handleSave} isLoading={isProcessing} leftIcon={<Save size={14} />} className="rounded-md">
              Simpan Transaksi
            </Button>
          )}
        </div>
      }
    >
      {isAddingClient ? (
        <div className="space-y-10 py-2">
          <div className="space-y-5">
            <SectionHeader
              icon={<Contact2 size={16} />}
              title="Identitas Personal Client"
              className="pb-2 border-b border-gray-50 mb-5"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <div className="flex gap-3 items-end">
                  <Select
                    label="Sapaan & Nama Lengkap*"
                    value={newClient.salutation}
                    onChange={e => setNewClient({ ...newClient, salutation: e.target.value })}
                    className="!w-32 rounded-md"
                  >
                    <option value="">Sapaan</option>
                    <option value="Bapak">Bapak</option>
                    <option value="Ibu">Ibu</option>
                  </Select>
                  <Input
                    value={newClient.name}
                    onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                    placeholder="Ketik nama lengkap client..."
                    className="rounded-md"
                  />
                </div>
              </div>
              <Input
                label="Email Aktif"
                type="email"
                value={newClient.email}
                onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                leftIcon={<Mail size={16} />}
                placeholder="nama@perusahaan.com"
                className="rounded-md"
              />
              <div className="space-y-2">
                <Label className="text-[10px] text-gray-400 uppercase !capitalize !tracking-tight ml-1">WhatsApp</Label>
                <div className="flex border border-gray-100 rounded-md overflow-hidden focus-within:border-blue-500 transition-all">
                  <div className="px-4 py-3.5 bg-gray-50 text-[11px] text-gray-400 border-r border-gray-100 flex items-center">+62</div>
                  <Input
                    type="tel"
                    value={waNumber}
                    onChange={e => handleWaNumberChange(e.target.value)}
                    className="flex-1 px-4 py-3.5 text-sm outline-none bg-transparent border-none focus:ring-0"
                    placeholder="812..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <SectionHeader
              icon={<Building size={16} />}
              title="Perusahaan / Instansi Client"
              className="pb-2 border-b border-gray-50 mb-5"
            />
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <Label className="text-[10px] text-gray-400 uppercase !capitalize !tracking-tight">Pilih Data Perusahaan</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddingCo(!isAddingCo)}
                  className="!p-0 text-blue-600 hover:underline h-auto"
                  leftIcon={isAddingCo ? <X size={10} /> : <Plus size={10} />}
                >
                  {isAddingCo ? 'Batal' : 'Tambah Baru'}
                </Button>
              </div>

              {isAddingCo ? (
                <div className="p-6 bg-blue-50/30 border border-blue-100 rounded-md space-y-5 shadow-inner">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Nama Instansi*"
                      value={newCo.name}
                      onChange={e => setNewCo({ ...newCo, name: e.target.value })}
                      placeholder="PT..."
                      className="rounded-md"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Subtext className="text-[9px] text-gray-400 uppercase !capitalize !tracking-tight ml-1">Kategori*</Subtext>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsAddingCatInCo(!isAddingCatInCo)}
                          className="!p-0 text-blue-600 hover:underline h-auto !text-[8px]"
                        >
                          {isAddingCatInCo ? 'Batal' : '+ Kategori'}
                        </Button>
                      </div>
                      {isAddingCatInCo ? (
                        <div className="flex gap-2">
                          <Input
                            autoFocus
                            value={newCatInCoName}
                            onChange={e => setNewCatInCoName(e.target.value)}
                            placeholder="Kategori..."
                            className="rounded-md"
                          />
                          <Button onClick={handleQuickAddCatInCo} variant="primary" className="!px-3 rounded-md"><CheckIcon size={14} /></Button>
                        </div>
                      ) : (
                        <Select value={newCo.category_id} onChange={e => setNewCo({ ...newCo, category_id: e.target.value })} className="rounded-md">
                          <option value="">-- Pilih Kategori --</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </Select>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        label="Alamat Kantor*"
                        value={newCo.address}
                        onChange={e => setNewCo({ ...newCo, address: e.target.value })}
                        placeholder="Jalan raya no 123..."
                        className="rounded-md"
                      />
                    </div>
                  </div>
                  <Button onClick={handleQuickAddCo} isLoading={coProcessing} className="w-full rounded-md">SIMPAN PERUSAHAAN</Button>
                </div>
              ) : (
                <Select value={newClient.client_company_id || ''} onChange={e => setNewClient({ ...newClient, client_company_id: e.target.value ? Number(e.target.value) : null })} className="rounded-md">
                  <option value="">-- Perorangan --</option>
                  {clientCompanies.map(co => <option key={co.id} value={co.id}>{co.name}</option>)}
                </Select>
              )}
            </div>
          </div>
        </div>
      ) : (
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
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddingClient(true)}
                  className="!text-[10px] !p-1 !text-blue-600"
                  leftIcon={<Plus size={10} />}
                >
                  Tambah Baru
                </Button>
              }
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
              <Select
                label="Probabilitas (%)"
                value={form.probability?.toString()}
                onChange={e => setForm({ ...form, probability: Number(e.target.value) })}
                className="rounded-md"
              >
                <option value="0">0%</option>
                <option value="25">25%</option>
                <option value="50">50%</option>
                <option value="75">75%</option>
                <option value="100">100%</option>
              </Select>
              <Select
                label="Penanggung Jawab (Sales)"
                value={form.sales_id}
                onChange={e => setForm({ ...form, sales_id: e.target.value })}
                className="rounded-md"
              >
                {members.map(m => <option key={m.user_id} value={m.user_id}>{m.profile?.full_name || 'Tanpa Nama'}</option>)}
              </Select>
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
      )}
    </Modal>
  );
};
