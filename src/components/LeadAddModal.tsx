
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Lead, Company, CompanyMember, LeadStage, LeadSource, ClientCompany, ClientCompanyCategory } from '@/lib/types';
import { 
  Mail, Building, Plus, X, Contact2, CheckCircle2, 
  Wallet, Globe, Trello, UserCircle, FileText, Loader2, Save, Check as CheckIcon
} from 'lucide-react';
import { Modal } from './Modal';

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
    address: '', notes: '', sales_id: members[0]?.profile?.id || '',  
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
           <button onClick={onClose} className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-all">Batal</button>
           <button onClick={handleSave} disabled={isProcessing} className="px-10 py-3.5 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 flex items-center gap-2 hover:bg-blue-700 active:scale-95 transition-all">
             {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />} Simpan Data Lead
           </button>
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
                <select 
                  value={form.salutation} 
                  onChange={e => setForm({...form, salutation: e.target.value})} 
                  className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold w-32 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm"
                >
                  <option value="">Sapaan</option>
                  <option value="Bapak">Bapak</option>
                  <option value="Ibu">Ibu</option>
                </select>
                <input 
                  type="text" 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                  className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-5 py-3.5 text-sm font-bold outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm" 
                  placeholder="Ketik nama lengkap client..." 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Aktif</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={16} />
                <input 
                  type="email" 
                  value={form.email} 
                  onChange={e => setForm({...form, email: e.target.value})} 
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm" 
                  placeholder="nama@perusahaan.com" 
                />
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
              <button 
                type="button" 
                onClick={() => setIsAddingCo(!isAddingCo)} 
                className="text-[9px] font-bold text-blue-600 uppercase hover:underline transition-all flex items-center gap-1"
              >
                {isAddingCo ? <><X size={10}/> Batal</> : <><Plus size={10}/> Tambah Baru</>}
              </button>
            </div>

            {isAddingCo ? (
              <div className="p-6 bg-blue-50/30 border border-blue-100 rounded-2xl space-y-5 animate-in zoom-in-95 duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-gray-400 uppercase ml-1">Nama Instansi*</p>
                        <input 
                          type="text" 
                          value={newCo.name} 
                          onChange={e => setNewCo({...newCo, name: e.target.value})} 
                          className="w-full px-4 py-3 bg-white border border-blue-100 rounded-xl font-bold text-xs outline-none focus:border-blue-400 shadow-sm" 
                          placeholder="Misal: PT Teknologi Maju" 
                        />
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
                               <input autoFocus type="text" value={newCatInCoName} onChange={e => setNewCatInCoName(e.target.value)} className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-xl font-bold text-[10px] outline-none" placeholder="Ketik kategori..." />
                               <button onClick={handleQuickAddCatInCo} className="px-3 bg-blue-600 text-white rounded-xl"><CheckIcon size={14}/></button>
                            </div>
                         ) : (
                            <select value={newCo.category_id} onChange={e => setNewCo({...newCo, category_id: e.target.value})} className="w-full px-4 py-3 bg-white border border-blue-100 rounded-xl font-bold text-xs outline-none shadow-sm">
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
                  <button 
                    type="button" 
                    onClick={handleQuickAddCo} 
                    disabled={coProcessing} 
                    className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-[0.98] transition-all"
                  >
                      {coProcessing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} SIMPAN & PILIH PERUSAHAAN
                  </button>
              </div>
            ) : (
              <select 
                value={form.client_company_id || ''} 
                onChange={e => setForm({...form, client_company_id: e.target.value ? Number(e.target.value) : null})} 
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-4 text-sm font-bold outline-none cursor-pointer focus:bg-white focus:border-blue-500 transition-all shadow-sm"
              >
                  {clientCompanies.map(co => <option key={co.id} value={co.id}>{co.name}</option>)}
              </select>
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
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Estimasi Nilai (IDR)</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-blue-600">Rp</div>
                <input 
                  type="number" 
                  value={form.expected_value} 
                  onChange={e => setForm({...form, expected_value: Number(e.target.value)})} 
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm" 
                  placeholder="0" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Sumber Datang Lead</label>
              <div className="relative group">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={16} />
                <select 
                  value={form.source} 
                  onChange={e => setForm({...form, source: e.target.value})} 
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold uppercase tracking-tight outline-none focus:bg-white cursor-pointer transition-all shadow-sm"
                >
                  {sources.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Status / Tahapan</label>
              <div className="relative group">
                <Trello className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={16} />
                <select 
                  value={form.status} 
                  onChange={e => setForm({...form, status: e.target.value})} 
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold uppercase tracking-tight outline-none focus:bg-white cursor-pointer transition-all shadow-sm"
                >
                  {stages.map(s => <option key={s.id} value={s.name.toLowerCase()}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">PIC Sales Penanggung Jawab</label>
              <div className="relative group">
                <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={16} />
                <select 
                  value={form.sales_id} 
                  onChange={e => setForm({...form, sales_id: e.target.value})} 
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold uppercase tracking-tight outline-none focus:bg-white cursor-pointer transition-all shadow-sm"
                >
                  {members.map(m => <option key={m.profile?.id} value={m.profile?.id}>{m.profile?.full_name}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
             <div className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center">
               <FileText size={16} />
             </div>
             <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-900">Catatan & Kebutuhan Khusus</h4>
          </div>
          <textarea 
            value={form.notes} 
            onChange={e => setForm({...form, notes: e.target.value})} 
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-5 text-xs font-medium h-32 resize-none outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm" 
            placeholder="Tuliskan detail kebutuhan, preferensi, atau info tambahan mengenai lead ini..." 
          />
        </div>
      </div>
    </Modal>
  );
};
