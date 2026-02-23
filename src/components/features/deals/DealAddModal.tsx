
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Deal, Company, CompanyMember, Pipeline, Client, ClientCompany, ClientCompanyCategory } from '@/lib/types';
import { 
  Plus, Building, Target, User, FileText, Loader2, Save, X, 
  Contact2, CheckCircle2, Mail, Check as CheckIcon, Wallet, AlertCircle, Search, ChevronDown
} from 'lucide-react';
import { Modal, Button, Input, Select, Textarea, SectionHeader } from '@/components/ui';

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
  
  // Custom Searchable Dropdown State
  const [clientSearch, setClientSearch] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Error states for validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<Partial<Deal>>({
    name: '', client_id: undefined, customer_company: '', contact_name: '', 
    whatsapp: '', email: '', expected_value: 0, sales_id: user.id, 
    source: 'Manual Deal', notes: '', stage_id: pipeline?.stages?.[0]?.id || ''
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsClientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const co = clientCompanies.find(cc => cc.id === c.client_company_id);
      // Enhanced search to include client name AND company name
      const nameMatch = c.name.toLowerCase().includes(clientSearch.toLowerCase());
      const coMatch = co?.name.toLowerCase().includes(clientSearch.toLowerCase()) || false;
      return nameMatch || coMatch;
    });
  }, [clients, clientCompanies, clientSearch]);

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
        sales_id: form.sales_id,
        notes: form.notes,
        stage_id: form.stage_id || pipeline.stages?.[0]?.id,
        company_id: company.id,
        pipeline_id: pipeline.id,
        source: form.source
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
        setIsClientDropdownOpen(false);
        setClientSearch('');
    }
  };

  const selectedClient = clients.find(c => c.id === form.client_id);
  const selectedClientCo = selectedClient ? clientCompanies.find(cc => cc.id === selectedClient.client_company_id) : null;

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
                <Button onClick={handleQuickAddClient} isLoading={isProcessing} leftIcon={<CheckCircle2 size={14} />} variant="success">
                  Simpan & Pilih Client
                </Button>
             </React.Fragment>
           ) : (
             <Button onClick={handleSave} isLoading={isProcessing} leftIcon={<Save size={14} />}>
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
                        onChange={e => setNewClient({...newClient, salutation: e.target.value})} 
                        className="!w-32"
                      >
                        <option value="">Sapaan</option>
                        <option value="Bapak">Bapak</option>
                        <option value="Ibu">Ibu</option>
                      </Select>
                      <Input 
                        value={newClient.name} 
                        onChange={e => setNewClient({...newClient, name: e.target.value})} 
                        placeholder="Ketik nama lengkap client..." 
                      />
                    </div>
                  </div>
                  <Input 
                    label="Email Aktif"
                    type="email" 
                    value={newClient.email} 
                    onChange={e => setNewClient({...newClient, email: e.target.value})} 
                    leftIcon={<Mail size={16} />}
                    placeholder="nama@perusahaan.com" 
                  />
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">WhatsApp</label>
                    <div className="flex bg-gray-50 border border-gray-100 rounded-xl overflow-hidden focus-within:border-blue-500 focus-within:bg-white transition-all shadow-sm">
                      <div className="px-4 py-3.5 bg-gray-100/50 text-[11px] font-bold text-gray-400 border-r border-gray-100 flex items-center">+62</div>
                      <input 
                        type="tel" 
                        value={waNumber} 
                        onChange={e => handleWaNumberChange(e.target.value)} 
                        className="flex-1 px-4 py-3.5 text-sm font-bold outline-none bg-transparent" 
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
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pilih Data Perusahaan</label>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setIsAddingCo(!isAddingCo)} 
                      className="!p-0 text-blue-600 hover:underline h-auto font-bold"
                      leftIcon={isAddingCo ? <X size={10}/> : <Plus size={10}/>}
                    >
                      {isAddingCo ? 'Batal' : 'Tambah Baru'}
                    </Button>
                  </div>

                  {isAddingCo ? (
                    <div className="p-6 bg-blue-50/30 border border-blue-100 rounded-2xl space-y-5 shadow-inner">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input 
                              label="Nama Instansi*"
                              value={newCo.name} 
                              onChange={e => setNewCo({...newCo, name: e.target.value})} 
                              placeholder="PT..." 
                            />
                            <div className="space-y-1">
                               <div className="flex items-center justify-between">
                                  <p className="text-[9px] font-bold text-gray-400 uppercase ml-1">Kategori*</p>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => setIsAddingCatInCo(!isAddingCatInCo)} 
                                    className="!p-0 text-blue-600 hover:underline h-auto font-bold !text-[8px]"
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
                                     />
                                     <Button onClick={handleQuickAddCatInCo} variant="primary" className="!px-3"><CheckIcon size={14}/></Button>
                                  </div>
                               ) : (
                                  <Select value={newCo.category_id} onChange={e => setNewCo({...newCo, category_id: e.target.value})}>
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
                                  placeholder="Jalan raya no 123..." 
                                />
                            </div>
                        </div>
                        <Button onClick={handleQuickAddCo} isLoading={coProcessing} className="w-full">SIMPAN PERUSAHAAN</Button>
                    </div>
                  ) : (
                    <Select value={newClient.client_company_id || ''} onChange={e => setNewClient({...newClient, client_company_id: e.target.value ? Number(e.target.value) : null})}>
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
                  label="Nama Project / Deal*"
                  value={form.name} 
                  onChange={e => {
                      setForm({...form, name: e.target.value});
                      if (errors.name) setErrors(prev => { const n = {...prev}; delete n.name; return n; });
                  }} 
                  error={errors.name}
                  placeholder="Misal: Proyek Pengadaan Kursi 2025" 
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
                      className="!p-0 text-emerald-600 hover:underline h-auto font-bold"
                      leftIcon={<Plus size={10} />}
                    >
                      Tambah Baru
                    </Button>
                  }
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="md:col-span-2 space-y-2 relative" ref={dropdownRef}>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Pilih Client*</label>
                      <button 
                        type="button"
                        onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                        className={`w-full flex items-center justify-between px-5 py-3.5 bg-gray-50 border ${errors.client_id ? 'border-red-500' : 'border-gray-100'} rounded-xl font-bold outline-none shadow-sm transition-all text-left ${!selectedClient ? 'text-gray-400' : 'text-gray-900'}`}
                      >
                        <span className="truncate">
                          {selectedClient 
                            ? `${selectedClient.salutation ? `${selectedClient.salutation} ` : ''}${selectedClient.name} - ${selectedClientCo?.name || 'Perorangan'}` 
                            : '-- Pilih Client Terdaftar --'
                          }
                        </span>
                        <ChevronDown size={14} className={`transition-transform duration-300 ${isClientDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isClientDropdownOpen && (
                        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-2xl z-[150] overflow-hidden">
                          <div className="p-3 border-b border-gray-50">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                              <input 
                                autoFocus
                                type="text" 
                                placeholder="Cari nama client atau perusahaan..." 
                                value={clientSearch}
                                onChange={e => setClientSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-transparent rounded-lg text-xs font-bold outline-none focus:bg-white focus:border-blue-100 transition-all"
                              />
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto custom-scrollbar">
                            {filteredClients.length > 0 ? (
                              filteredClients.map(c => {
                                const co = clientCompanies.find(cc => cc.id === c.client_company_id);
                                return (
                                  <button 
                                    key={c.id}
                                    type="button"
                                    onClick={() => handleClientChange(c.id)}
                                    className="w-full px-4 py-3 flex flex-col items-start hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-none"
                                  >
                                    <span className="text-[11px] font-bold text-gray-900">{c.salutation ? `${c.salutation} ` : ''}{c.name}</span>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase">{co?.name || 'Perorangan'}</span>
                                  </button>
                                );
                              })
                            ) : (
                              <div className="p-6 text-center text-[10px] font-bold text-gray-300 uppercase tracking-widest italic">Tidak ada client ditemukan</div>
                            )}
                          </div>
                        </div>
                      )}

                      {errors.client_id && (
                        <p className="flex items-center gap-1 text-[10px] font-bold text-red-500 mt-1 ml-1">
                           <AlertCircle size={10} /> {errors.client_id}
                        </p>
                      )}
                   </div>
                </div>
             </div>

             <div className="space-y-5">
                <SectionHeader 
                  icon={<Wallet size={16} />}
                  title="Penilaian Finansial"
                  className="pb-2 border-b border-gray-50 mb-5"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input 
                    label="Nilai Proyeksi (IDR)"
                    type="number" 
                    value={form.expected_value} 
                    onChange={e => setForm({...form, expected_value: Number(e.target.value)})} 
                    leftIcon={<span className="text-[11px] font-bold text-indigo-500">Rp</span>}
                    placeholder="0" 
                  />
                  <Select 
                    label="Penanggung Jawab (Sales)"
                    value={form.sales_id} 
                    onChange={e => setForm({...form, sales_id: e.target.value})}
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
                  onChange={e => setForm({...form, notes: e.target.value})} 
                  placeholder="Tambahkan catatan strategis atau instruksi khusus untuk tim penangan deal ini..." 
                  className="h-32"
                />
             </div>
          </div>
        )}
    </Modal>
  );
};
