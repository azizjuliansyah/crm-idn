
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Lead, Company, CompanyMember, LeadStage, LeadSource, ClientCompany, ClientCompanyCategory } from '@/lib/types';
import { 
  Mail, Building, Plus, X, Contact2, CheckCircle2, 
  Wallet, Globe, Trello, UserCircle, FileText, Loader2, Save, Check as CheckIcon
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

import { Button, Input, Select, Textarea } from '@/components/ui';

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
  setClientCompanies: React.Dispatch<React.SetStateAction<ClientCompany[]>>;
  setCategories: React.Dispatch<React.SetStateAction<ClientCompanyCategory[]>>;
}

export const LeadAddModal: React.FC<LeadAddModalProps> = ({ 
  isOpen, onClose, company, members, stages, sources, clientCompanies, categories, onSuccess, setClientCompanies, setCategories 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAddingCo, setIsAddingCo] = useState(false);
  const [newCo, setNewCo] = useState({ name: '', category_id: '', address: '' });
  const [coProcessing, setCoProcessing] = useState(false);
  const [isAddingCatInCo, setIsAddingCatInCo] = useState(false);
  const [newCatInCoName, setNewCatInCoName] = useState('');
  const [catInCoProcessing, setCatInCoProcessing] = useState(false);

  const [form, setForm] = useState<Partial<Lead>>({
    salutation: '', name: '', whatsapp: '', email: '', 
    client_company_id: clientCompanies.find(c => c.name.toLowerCase() === 'perorangan')?.id || null,
    address: '', notes: '', sales_id: members[0]?.user_id || '',  
    source: sources[0]?.name || '', 
    status: stages[0]?.name.toLowerCase() || 'new',
    expected_value: 0
  });

  const [waNumber, setWaNumber] = useState('');

  const handleWaNumberChange = (val: string) => {
    let cleaned = val.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    setWaNumber(cleaned);
  };

  const handleQuickAddCatInCo = async () => {
    if (!newCatInCoName.trim()) return;
    setCatInCoProcessing(true);
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
    } finally {
      setCatInCoProcessing(false);
    }
  };

  const handleQuickAddCo = async (e: React.MouseEvent) => {
    e.preventDefault();
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
      setForm(prev => ({ ...prev, client_company_id: data.id }));
      setIsAddingCo(false);
      setNewCo({ name: '', category_id: '', address: '' });
      setIsAddingCatInCo(false);
    } catch (err: any) {
      alert("Gagal menambah perusahaan: " + err.message);
    } finally {
      setCoProcessing(false);
    }
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
      alert('Gagal Menyimpan: ' + error.message);
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
           <Button variant="ghost" onClick={onClose} className="text-gray-400">Batal</Button>
           <Button 
             onClick={handleSave} 
             isLoading={isProcessing} 
             leftIcon={<CheckCircle2 size={14} />}
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
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-900">Identitas Personal Client</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Sapaan & Nama Lengkap*</label>
              <div className="flex gap-3">
                <Select 
                  value={form.salutation} 
                  onChange={e => setForm({...form, salutation: e.target.value})} 
                  className="!w-32 !py-2.5"
                >
                  <option value="">Sapaan</option>
                  <option value="Bapak">Bapak</option>
                  <option value="Ibu">Ibu</option>
                </Select>
                <Input 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                  className="!py-2.5"
                  placeholder="Ketik nama lengkap client..." 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Input 
                label="Email Aktif"
                type="email" 
                value={form.email} 
                onChange={e => setForm({...form, email: e.target.value})} 
                leftIcon={<Mail size={16} />}
                className="!py-2.5"
                placeholder="nama@perusahaan.com" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">WhatsApp</label>
              <div className="flex bg-gray-50 border border-gray-100 rounded-xl overflow-hidden focus-within:border-blue-500 focus-within:bg-white transition-all shadow-sm">
                <div className="px-4 py-2.5 bg-gray-100/50 text-[11px] font-bold text-gray-400 border-r border-gray-100 flex items-center">+62</div>
                <Input 
                  type="tel" 
                  value={waNumber} 
                  onChange={e => handleWaNumberChange(e.target.value)} 
                  className="flex-1 !border-none !bg-transparent !shadow-none !rounded-none" 
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
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-900">Perusahaan / Instansi Client</h4>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pilih Data Perusahaan</label>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsAddingCo(!isAddingCo)} 
                className="!text-[9px] !p-0 hover:!bg-transparent text-blue-600 lowercase"
              >
                {isAddingCo ? <><X size={10} className="mr-1"/> Batal</> : <><Plus size={10} className="mr-1"/> Tambah Baru</>}
              </Button>
            </div>

            {isAddingCo ? (
              <div className="p-6 bg-blue-50/30 border border-blue-100 rounded-2xl space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input 
                        label="Nama Instansi*"
                        value={newCo.name} 
                        onChange={e => setNewCo({...newCo, name: e.target.value})} 
                        className="!py-2.5 !text-xs !bg-white border-blue-100 focus:border-blue-400"
                        placeholder="Misal: PT Teknologi Maju" 
                      />
                      <div className="space-y-1">
                         <div className="flex items-center justify-between mb-1">
                            <p className="text-[9px] font-bold text-gray-400 uppercase ml-1">Kategori*</p>
                            <Button variant="ghost" size="sm" onClick={() => setIsAddingCatInCo(!isAddingCatInCo)} className="!text-[8px] !font-bold text-blue-600 uppercase hover:underline !p-0 !h-auto">
                              {isAddingCatInCo ? 'Batal' : '+ Kategori'}
                            </Button>
                         </div>
                         {isAddingCatInCo ? (
                            <div className="flex gap-2">
                               <Input autoFocus value={newCatInCoName} onChange={e => setNewCatInCoName(e.target.value)} className="!py-2 !px-3 !text-[10px] !bg-white border-blue-200" placeholder="Ketik kategori..." />
                               <Button onClick={handleQuickAddCatInCo} size="sm" className="!px-3"><CheckIcon size={14}/></Button>
                            </div>
                         ) : (
                            <Select value={newCo.category_id} onChange={e => setNewCo({...newCo, category_id: e.target.value})} className="!py-2.5 !text-xs !bg-white border-blue-100">
                                <option value="">-- Pilih Kategori --</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </Select>
                         )}
                      </div>
                      <div className="md:col-span-2">
                        <Input 
                          label="Alamat Kantor*"
                          value={newCo.address} 
                          onChange={e => setNewCo({...newCo, address: e.target.value})} 
                          className="!py-2.5 !text-xs !bg-white border-blue-100 focus:border-blue-400"
                          placeholder="Jalan raya no 123..." 
                        />
                      </div>
                  </div>
                  <Button 
                    onClick={handleQuickAddCo} 
                    isLoading={coProcessing} 
                    className="w-full !py-3.5 shadow-blue-200"
                    leftIcon={<Save size={14} />}
                  >
                      SIMPAN & PILIH PERUSAHAAN
                  </Button>
              </div>
            ) : (
              <Select 
                value={form.client_company_id || ''} 
                onChange={e => setForm({...form, client_company_id: e.target.value ? Number(e.target.value) : null})} 
                className="!py-3"
              >
                  {clientCompanies.map(co => <option key={co.id} value={co.id}>{co.name}</option>)}
              </Select>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Wallet size={16} />
            </div>
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-900">Detail Peluang Bisnis</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input 
              label="Estimasi Nilai (IDR)"
              type="number" 
              value={form.expected_value} 
              onChange={e => setForm({...form, expected_value: Number(e.target.value)})} 
              leftIcon={<span className="text-[11px] font-bold text-blue-600">Rp</span>}
              className="!py-2.5"
              placeholder="0" 
            />

            <Select 
              label="Sumber Datang Lead"
              value={form.source} 
              onChange={e => setForm({...form, source: e.target.value})} 
              className="!py-2.5 !text-xs uppercase tracking-tight"
            >
              {sources.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </Select>

            <Select 
              label="Status / Tahapan"
              value={form.status} 
              onChange={e => setForm({...form, status: e.target.value})} 
              className="!py-2.5 !text-xs uppercase tracking-tight"
            >
              {stages.map(s => <option key={s.id} value={s.name.toLowerCase()}>{s.name}</option>)}
            </Select>

            <Select 
              label="PIC Sales Penanggung Jawab"
              value={form.sales_id} 
              onChange={e => setForm({...form, sales_id: e.target.value})} 
              className="!py-2.5 !text-xs uppercase tracking-tight"
            >
              {members.map(m => <option key={m.user_id} value={m.user_id}>{m.profile?.full_name || 'Tanpa Nama'}</option>)}
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
             <div className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center">
               <FileText size={16} />
             </div>
             <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-900">Catatan & Kebutuhan Khusus</h4>
          </div>
          <Textarea 
            value={form.notes} 
            onChange={e => setForm({...form, notes: e.target.value})} 
            className="h-32 resize-none" 
            placeholder="Tuliskan detail kebutuhan, preferensi, atau info tambahan mengenai lead ini..." 
          />
        </div>
      </div>
    </Modal>
  );
};
