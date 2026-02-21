
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Deal, Company, CompanyMember, Pipeline, Client, ClientCompany, ClientCompanyCategory } from '@/lib/types';
import { 
  Plus, Building, Target, User, FileText, Loader2, Save, X, 
  Contact2, CheckCircle2, Mail, Check as CheckIcon, Wallet, AlertCircle, Search, ChevronDown
} from 'lucide-react';
import { Modal } from './Modal';

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
                <button onClick={() => setIsAddingClient(false)} className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-all">Batal</button>
                <button onClick={handleQuickAddClient} disabled={isProcessing} className="px-10 py-4 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-emerald-700 transition-all">
                  {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />} Simpan & Pilih Client
                </button>
             </React.Fragment>
           ) : (
             <button onClick={handleSave} disabled={isProcessing} className="px-10 py-3.5 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 flex items-center gap-2 hover:bg-blue-700 active:scale-95 transition-all">
               {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Simpan Transaksi
             </button>
           )}
        </div>
      }
    >
        {isAddingClient ? (
          <div className="space-y-10 py-2 animate-in slide-in-from-right-4 duration-300">
             <div className="space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
                    <Contact2 size={16} />
                  </div>
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-900">Identitas Personal Client</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Sapaan & Nama Lengkap*</label>
                    <div className="flex gap-3">
                      <select 
                        value={newClient.salutation} 
                        onChange={e => setNewClient({...newClient, salutation: e.target.value})} 
                        className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold w-32 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm"
                      >
                        <option value="">Sapaan</option>
                        <option value="Bapak">Bapak</option>
                        <option value="Ibu">Ibu</option>
                      </select>
                      <input 
                        type="text" 
                        value={newClient.name} 
                        onChange={e => setNewClient({...newClient, name: e.target.value})} 
                        className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-5 py-3.5 text-sm font-bold outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm" 
                        placeholder="Ketik nama lengkap client..." 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Aktif</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={16} />
                      <input type="email" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold outline-none focus:bg-white shadow-sm" placeholder="nama@perusahaan.com" />
                    </div>
                  </div>
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
                <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
                    <Building size={16} />
                  </div>
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-900">Perusahaan / Instansi Client</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pilih Data Perusahaan</label>
                    <button type="button" onClick={() => setIsAddingCo(!isAddingCo)} className="text-[9px] font-bold text-blue-600 uppercase hover:underline flex items-center gap-1">
                      {isAddingCo ? <><X size={10}/> Batal</> : <><Plus size={10}/> Tambah Baru</>}
                    </button>
                  </div>

                  {isAddingCo ? (
                    <div className="p-6 bg-blue-50/30 border border-blue-100 rounded-2xl space-y-5 animate-in zoom-in-95 duration-200 shadow-inner">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <p className="text-[9px] font-bold text-gray-400 uppercase ml-1">Nama Instansi*</p>
                              <input type="text" value={newCo.name} onChange={e => setNewCo({...newCo, name: e.target.value})} className="w-full px-4 py-3 bg-white border border-blue-100 rounded-xl font-bold text-xs outline-none focus:border-blue-400 shadow-sm" placeholder="PT..." />
                            </div>
                            <div className="space-y-1">
                               <div className="flex items-center justify-between">
                                  <p className="text-[9px] font-bold text-gray-400 uppercase ml-1">Kategori*</p>
                                  <button type="button" onClick={() => setIsAddingCatInCo(!isAddingCatInCo)} className="text-[8px] font-bold text-blue-600 uppercase hover:underline">
                                    {isAddingCatInCo ? 'Batal' : '+ Kategori'}
                                  </button>
                               </div>
                               {isAddingCatInCo ? (
                                  <div className="flex gap-2">
                                     <input autoFocus type="text" value={newCatInCoName} onChange={e => setNewCatInCoName(e.target.value)} className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-xl font-bold text-[10px] outline-none" placeholder="Kategori..." />
                                     <button onClick={handleQuickAddCatInCo} className="px-3 bg-blue-600 text-white rounded-xl"><CheckIcon size={14}/></button>
                                  </div>
                               ) : (
                                  <select value={newCo.category_id} onChange={e => setNewCo({...newCo, category_id: e.target.value})} className="w-full px-4 py-3 bg-white border border-blue-100 rounded-xl font-bold text-xs outline-none shadow-sm shadow-inner">
                                      <option value="">-- Pilih Kategori --</option>
                                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                  </select>
                               )}
                            </div>
                            <div className="md:col-span-2 space-y-1">
                                <p className="text-[9px] font-bold text-gray-400 uppercase ml-1">Alamat Kantor*</p>
                                <input 
                                    type="text" 
                                    value={newCo.address} 
                                    onChange={e => setNewCo({...newCo, address: e.target.value})} 
                                    className="w-full px-4 py-3 bg-white border border-blue-100 rounded-xl font-bold text-xs outline-none focus:border-blue-400 shadow-sm" 
                                    placeholder="Jalan raya no 123..." 
                                />
                            </div>
                        </div>
                        <button type="button" onClick={handleQuickAddCo} disabled={coProcessing} className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase shadow-lg shadow-blue-100 active:scale-95 transition-all">SIMPAN PERUSAHAAN</button>
                    </div>
                  ) : (
                    <select value={newClient.client_company_id || ''} onChange={e => setNewClient({...newClient, client_company_id: e.target.value ? Number(e.target.value) : null})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-4 text-sm font-bold shadow-sm outline-none cursor-pointer focus:bg-white focus:border-blue-500 transition-all">
                        <option value="">-- Perorangan --</option>
                        {clientCompanies.map(co => <option key={co.id} value={co.id}>{co.name}</option>)}
                    </select>
                  )}
                </div>
             </div>
          </div>
        ) : (
          <div className="space-y-8 pb-4 animate-in slide-in-from-left-4 duration-300">
             <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
                   <Target size={16} className="text-blue-500" />
                   <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-900">Identitas Transaksi</h4>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nama Project / Deal*</label>
                  <input 
                    type="text" 
                    value={form.name} 
                    onChange={e => {
                        setForm({...form, name: e.target.value});
                        if (errors.name) setErrors(prev => { const n = {...prev}; delete n.name; return n; });
                    }} 
                    className={`w-full px-5 py-4 bg-gray-50 border ${errors.name ? 'border-red-500' : 'border-gray-100'} rounded-xl font-bold outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm shadow-inner`} 
                    placeholder="Misal: Proyek Pengadaan Kursi 2025" 
                  />
                  {errors.name && (
                    <p className="flex items-center gap-1 text-[10px] font-bold text-red-500 mt-1 ml-1 animate-in fade-in">
                       <AlertCircle size={10} /> {errors.name}
                    </p>
                  )}
                </div>
             </div>
             
             <div className="space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
                   <User size={16} className="text-emerald-500" />
                   <div className="flex items-center justify-between flex-1">
                      <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-900">Data Client Utama</h4>
                      <button type="button" onClick={() => setIsAddingClient(true)} className="text-[9px] font-bold text-emerald-600 uppercase hover:underline flex items-center gap-1 transition-all">
                         <Plus size={10} /> Tambah Baru
                      </button>
                   </div>
                </div>
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
                        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-2xl z-[150] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
                        <p className="flex items-center gap-1 text-[10px] font-bold text-red-500 mt-1 ml-1 animate-in fade-in">
                           <AlertCircle size={10} /> {errors.client_id}
                        </p>
                      )}
                   </div>
                </div>
             </div>

             <div className="space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
                   <Wallet size={16} className="text-indigo-500" />
                   <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-900">Penilaian Finansial</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nilai Proyeksi (IDR)</label>
                     <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-indigo-500">Rp</div>
                        <input type="number" value={form.expected_value} onChange={e => setForm({...form, expected_value: Number(e.target.value)})} className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold shadow-sm focus:bg-white focus:border-blue-500 transition-all" placeholder="0" />
                     </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Penanggung Jawab (Sales)</label>
                     <select value={form.sales_id} onChange={e => setForm({...form, sales_id: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold shadow-sm focus:bg-white focus:border-blue-500 transition-all">
                       {members.map(m => <option key={m.profile?.id} value={m.profile?.id}>{m.profile?.full_name}</option>)}
                     </select>
                  </div>
                </div>
             </div>

             <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-gray-400" />
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Detail & Keterangan</label>
                </div>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl h-32 outline-none resize-none focus:bg-white focus:border-blue-500 shadow-sm transition-all shadow-inner font-medium text-xs" placeholder="Tambahkan catatan strategis atau instruksi khusus untuk tim penangan deal ini..." />
             </div>
          </div>
        )}
    </Modal>
  );
};
