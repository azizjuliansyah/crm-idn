'use client';
import { Plus, Save, X, Mail, Building, Contact2, Wallet, FileText, Check as CheckIcon, CheckCircle as CheckCircle2, User } from 'lucide-react';
import { Company, Client, ClientCompany, ClientCompanyCategory, Lead, LeadStage, LeadSource, CompanyMember } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import React, { useState, useCallback } from 'react';
import { Input, Textarea, Button, Modal, H4, ComboBox, Label } from '@/components/ui';
import { ClientFormModal } from '@/components/features/clients/components/ClientFormModal';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/lib/store/useAppStore';

interface LeadAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  members: CompanyMember[];
  stages: LeadStage[];
  sources: LeadSource[];
  clientCompanies: ClientCompany[];
  categories: ClientCompanyCategory[];
  onSuccess: () => void;
}

export const LeadAddModal: React.FC<LeadAddModalProps> = ({
  isOpen, onClose, company, members, stages, sources, clientCompanies, categories, onSuccess
}) => {
  const queryClient = useQueryClient();
  const { showToast } = useAppStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');

  // ClientFormModal State
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientForm, setClientForm] = useState<Partial<Client>>({ salutation: '', name: '', email: '', whatsapp: '', client_company_id: null });
  const [isProcessingQuick, setIsProcessingQuick] = useState(false);

  const fetchClients = useCallback(async ({ from, to }: { from: number, to: number }) => {
    let query = supabase.from('clients')
      .select('*, client_company:client_companies(*)', { count: 'exact' })
      .eq('company_id', company.id)
      .order('name');

    if (clientSearchTerm) {
      query = query.ilike('name', `%${clientSearchTerm}%`);
    }

    const { data, error, count } = await query.range(from, to);
    return { data: data || [], error, count };
  }, [company.id, clientSearchTerm]);

  const {
    data: clients,
    isLoadingMore: clientsLoadingMore,
    hasMore: clientsHasMore,
    loadMore: loadMoreClients,
    refresh: refreshClients
  } = useInfiniteScroll<Client>(fetchClients, {
    pageSize: 20,
    dependencies: [company.id, clientSearchTerm]
  });

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find(c => c.id.toString() === clientId);
    if (client) {
      setForm(prev => ({
        ...prev,
        salutation: client.salutation || '',
        name: client.name || '',
        email: client.email || '',
        client_company_id: client.client_company_id,
      }));
      if (client.whatsapp) {
        setWaNumber(client.whatsapp.startsWith('+62') ? client.whatsapp.replace('+62', '') : client.whatsapp);
      } else {
        setWaNumber('');
      }
    } else {
      setForm(prev => ({
        ...prev,
        salutation: '',
        name: '',
        email: '',
        client_company_id: clientCompanies.find(c => c.name.toLowerCase() === 'perorangan')?.id || null,
      }));
      setWaNumber('');
    }
  };

  const [form, setForm] = useState<Partial<Lead>>({
    salutation: '', name: '', whatsapp: '', email: '',
    client_company_id: clientCompanies.find(c => c.name.toLowerCase() === 'perorangan')?.id || null,
    address: '', notes: '', sales_id: members[0]?.user_id || '',
    source: sources[0]?.name || '',
    status: stages[0]?.name.toLowerCase() || 'new',
    expected_value: 0,
    input_date: new Date().toISOString().split('T')[0]
  });

  const [waNumber, setWaNumber] = useState('');

  const handleWaNumberChange = (val: string) => {
    let cleaned = val.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    setWaNumber(cleaned);
  };

  const handleSaveClient = async (formData: Partial<Client>) => {
    if (!formData.name?.trim()) return;
    setIsProcessingQuick(true);
    try {
      const { data, error } = await supabase.from('clients').insert({
        company_id: company.id,
        salutation: formData.salutation,
        name: formData.name.trim(),
        client_company_id: formData.client_company_id,
        email: formData.email,
        whatsapp: formData.whatsapp ? `+62${formData.whatsapp.replace(/\D/g, '')}` : null
      }).select().single();
      if (error) throw error;

      refreshClients();
      handleClientSelect(String(data.id));
      setIsClientModalOpen(false);
      setClientForm({ salutation: '', name: '', email: '', whatsapp: '', client_company_id: null });
    } catch (err: any) { showToast(err.message, 'error'); } finally { setIsProcessingQuick(false); }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsProcessing(true);
    const fullWa = waNumber ? `+62${waNumber}` : '';
    const leadData = {
      ...form,
      sales_id: form.sales_id || null,
      client_company_id: form.client_company_id || null,
      whatsapp: fullWa,
      company_id: company.id
    };

    try {
      const { error } = await supabase.from('leads').insert(leadData);
      if (error) throw error;
      onSuccess();
      onClose();
    } catch (error: any) {
      showToast('Gagal Menyimpan: ' + error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrasi Prospek Baru"
      size="lg"
      footer={
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onClose} className="text-gray-400">Batal</Button>
          <Button
            onClick={handleSave}
            isLoading={isProcessing}
            leftIcon={<CheckCircle2 size={14} />}
            variant='primary'
          >
            Simpan Data Lead
          </Button>
        </div>
      }
    >
      <div className="space-y-10 py-2">
        <div className="space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Contact2 size={16} />
            </div>
            <H4>Identitas Personal Client</H4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 md:col-span-2">
              <ComboBox
                label="Pilih Client (Atau Tambah Baru)"
                placeholder="Pilih Pelanggan"
                value={selectedClientId}
                onChange={(val: string | number) => handleClientSelect(val.toString())}
                options={[
                  ...clients.map(c => ({
                    value: c.id.toString(),
                    label: c.name,
                    sublabel: c.client_company?.name || 'PERSONAL'
                  }))
                ]}
                onAddNew={() => setIsClientModalOpen(true)}
                addNewLabel="Tambah Pelanggan Baru"
                leftIcon={<User size={16} />}
                onLoadMore={loadMoreClients}
                hasMore={clientsHasMore}
                isLoadingMore={clientsLoadingMore}
                onSearchChange={setClientSearchTerm}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Input
                label="Tanggal Input"
                type="date"
                value={form.input_date || ''}
                onChange={e => setForm({ ...form, input_date: e.target.value })}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <ComboBox
                    label="Sapaan*"
                    value={form.salutation || ''}
                    onChange={(val: string | number) => setForm({ ...form, salutation: val.toString() })}
                    options={[
                      { value: '-', label: '-' },
                      { value: 'Bapak', label: 'Bapak' },
                      { value: 'Ibu', label: 'Ibu' },
                    ]}
                    hideSearch
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    label="Nama Lengkap*"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Ketik nama lengkap client..."
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Input
                label="Email Aktif"
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                leftIcon={<Mail size={16} />}
                placeholder="nama@perusahaan.com"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px]  text-gray-400 font-bold uppercase  ml-1">WhatsApp</Label>
              <div className="flex border border-gray-100 rounded-md overflow-hidden focus-within:border-blue-500 focus-within:bg-white transition-all">
                <div className="px-4 py-2.5 bg-gray-100/50 text-[11px]  text-gray-400 border-r border-gray-100 flex items-center font-bold">+62</div>
                <input
                  type="tel"
                  value={waNumber}
                  onChange={e => handleWaNumberChange(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 border-none bg-transparent outline-none shadow-none rounded-none font-bold"
                  placeholder="812345678..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Building size={16} />
            </div>
            <H4>Perusahaan / Instansi Client</H4>
          </div>

          <div className="space-y-3">
            <ComboBox
              value={form.client_company_id?.toString() || ''}
              label="Pilih Perusahaan"
              onChange={(val: string | number) => setForm({ ...form, client_company_id: val ? Number(val) : null })}
              options={[
                { value: '', label: 'Personal / Individual' },
                ...clientCompanies.map(co => ({ value: co.id.toString(), label: co.name }))
              ]}
            />
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Wallet size={16} />
            </div>
            <H4>Detail Peluang Bisnis</H4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Estimasi Nilai (IDR)"
              type="number"
              value={form.expected_value}
              onChange={e => setForm({ ...form, expected_value: Number(e.target.value) })}
              leftIcon={<span className="text-[11px] font-bold text-blue-600">Rp</span>}
              placeholder="0"
            />

            <ComboBox
              label="Sumber Datang Lead"
              value={form.source || ''}
              onChange={(val: string | number) => setForm({ ...form, source: val.toString() })}
              options={sources.map(s => ({ value: s.name, label: s.name }))}
            />

            <ComboBox
              label="Status / Tahapan"
              hideSearch
              value={form.status || ''}
              onChange={(val: string | number) => setForm({ ...form, status: val.toString() })}
              options={stages.map(s => ({ value: s.name.toLowerCase(), label: s.name }))}
            />

            <ComboBox
              label="PIC Sales Penanggung Jawab"
              value={form.sales_id || ''}
              onChange={(val: string | number) => setForm({ ...form, sales_id: val.toString() })}
              options={members.map(m => ({ value: m.user_id, label: m.profile?.full_name || 'Tanpa Nama' }))}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
            <div className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center">
              <FileText size={16} />
            </div>
            <H4>Catatan & Kebutuhan Khusus</H4>
          </div>
          <Textarea
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            className="h-32 resize-none"
            placeholder="Tuliskan detail kebutuhan, preferensi, atau info tambahan mengenai lead ini..."
          />
        </div>
      </div>

      <ClientFormModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        form={clientForm}
        setForm={setClientForm}
        isProcessing={isProcessingQuick}
        onSave={handleSaveClient}
        clientCompanies={clientCompanies}
        categories={categories}
        companyId={company.id}
      />
    </Modal>
  );
};
