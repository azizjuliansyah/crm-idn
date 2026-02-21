'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, Client, ClientCompany, ClientCompanyCategory } from '@/lib/types';
import { 
  Plus, Search, Edit2, Trash2, Loader2, Contact, 
  MapPin, Mail, Phone, ChevronRight, X, Save, Building, Check, Tags, Info,
  ChevronUp, ChevronDown, AlertTriangle, ArrowUpDown, CheckCircle2
} from 'lucide-react';
import { Modal } from '@/components/Modal';

interface Props {
  company: Company;
}

type SortKey = 'name' | 'company' | 'email' | 'whatsapp' | 'id';
type SortConfig = { key: SortKey; direction: 'asc' | 'desc' } | null;

export const ClientsView: React.FC<Props> = ({ company }) => {
  const [items, setItems] = useState<Client[]>([]);
  const [rawCompanies, setRawCompanies] = useState<ClientCompany[]>([]);
  const [categories, setCategories] = useState<ClientCompanyCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id', direction: 'desc' });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Custom Modal States
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null; name: string }>({ isOpen: false, id: null, name: '' });
  const [isConfirmBulkOpen, setIsConfirmBulkOpen] = useState(false);
  const [notification, setNotification] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' }>({ 
    isOpen: false, title: '', message: '', type: 'success' 
  });

  // Quick Add Company State
  const [isAddingCo, setIsAddingCo] = useState(false);
  const [newCo, setNewCo] = useState({ name: '', category_id: '', address: '' });
  const [coProcessing, setCoProcessing] = useState(false);

  // Nested Quick Add Category State
  const [isAddingCatInCo, setIsAddingCatInCo] = useState(false);
  const [newCatInCoName, setNewCatInCoName] = useState('');
  const [catInCoProcessing, setCatInCoProcessing] = useState(false);

  const [form, setForm] = useState<Partial<Client>>({
    salutation: '', name: '', client_company_id: null, email: '', whatsapp: ''
  });

  const fetchData = useCallback(async () => {
    if (!company?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [clientsRes, cosRes, catsRes] = await Promise.all([
        supabase.from('clients').select('*').eq('company_id', company.id).order('id', { ascending: false }),
        supabase.from('client_companies').select('*').eq('company_id', company.id).order('name'),
        supabase.from('client_company_categories').select('*').eq('company_id', company.id).order('name')
      ]);

      if (clientsRes.data) setItems(clientsRes.data);
      if (cosRes.data) setRawCompanies(cosRes.data);
      if (catsRes.data) setCategories(catsRes.data);
      setSelectedIds([]);
    } catch (error) {
      console.error("Fetch Data Error:", error);
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clientCompanies = useMemo(() => {
    return rawCompanies.map(co => ({
      ...co,
      client_company_categories: categories.find(cat => cat.id === co.category_id)
    }));
  }, [rawCompanies, categories]);

  const clientsWithData = useMemo(() => {
    let result = items.map(item => ({
      ...item,
      client_company: clientCompanies.find(co => co.id === item.client_company_id)
    }));

    if (searchTerm) {
      result = result.filter(i => 
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (i.client_company?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sortConfig) {
      result.sort((a, b) => {
        let valA: any, valB: any;
        
        switch(sortConfig.key) {
          case 'name': valA = a.name; valB = b.name; break;
          case 'company': valA = a.client_company?.name || ''; valB = b.client_company?.name || ''; break;
          case 'email': valA = a.email || ''; valB = b.email || ''; break;
          case 'whatsapp': valA = a.whatsapp || ''; valB = b.whatsapp || ''; break;
          default: valA = a.id; valB = b.id;
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [items, clientCompanies, searchTerm, sortConfig]);

  const selectedCoDetails = useMemo(() => {
    if (!form.client_company_id) return null;
    return clientCompanies.find(co => co.id === form.client_company_id) || null;
  }, [form.client_company_id, clientCompanies]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === clientsWithData.length) setSelectedIds([]);
    else setSelectedIds(clientsWithData.map(i => i.id));
  };

  const showNotification = (title: string, message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ isOpen: true, title, message, type });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('clients').delete().in('id', selectedIds);
      if (error) throw error;
      await fetchData();
      setIsConfirmBulkOpen(false);
      showNotification('Berhasil', `Berhasil menghapus ${selectedIds.length} data client.`);
    } catch (err: any) {
      showNotification('Gagal', err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
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
      
      setCategories(prev => [...prev, data as any].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCo(prev => ({ ...prev, category_id: String(data.id) }));
      setNewCatInCoName('');
      setIsAddingCatInCo(false);
    } catch (err: any) {
      showNotification('Gagal', err.message, 'error');
    } finally {
      setCatInCoProcessing(false);
    }
  };

  const handleQuickAddCo = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newCo.name.trim() || !newCo.category_id || !newCo.address.trim()) {
        showNotification('Data Tidak Lengkap', "Nama, Kategori, dan Alamat Perusahaan wajib diisi.", 'error');
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
      
      setRawCompanies(prev => [...prev, data as any].sort((a, b) => a.name.localeCompare(b.name)));
      setForm(prev => ({ ...prev, client_company_id: data.id }));
      setIsAddingCo(false);
      setNewCo({ name: '', category_id: '', address: '' });
      setIsAddingCatInCo(false);
    } catch (err: any) {
      showNotification('Gagal', err.message, 'error');
    } finally {
      setCoProcessing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
       showNotification('Nama Wajib Diisi', 'Silakan masukkan nama client.', 'error');
       return;
    }
    setIsProcessing(true);
    try {
      const payload = {
          salutation: form.salutation,
          name: form.name,
          client_company_id: form.client_company_id ? Number(form.client_company_id) : null,
          email: form.email,
          whatsapp: form.whatsapp,
          company_id: company.id
      };
      
      if (form.id) {
        await supabase.from('clients').update(payload).eq('id', form.id);
      } else {
        await supabase.from('clients').insert(payload);
      }
      setIsModalOpen(false);
      await fetchData();
      showNotification('Tersimpan', `Profil ${form.name} telah diperbarui.`, 'success');
    } catch (err: any) {
      showNotification('Gagal Menyimpan', err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('clients').delete().eq('id', confirmDelete.id);
      if (error) throw error;
      await fetchData();
      setConfirmDelete({ isOpen: false, id: null, name: '' });
      showNotification('Berhasil', `Data client ${confirmDelete.name} telah dihapus.`);
    } catch (err: any) {
      showNotification('Gagal Menghapus', err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortConfig?.key !== col) return <ArrowUpDown size={12} className="ml-1 opacity-20" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={12} className="ml-1 text-blue-600" /> : <ChevronDown size={12} className="ml-1 text-blue-600" />;
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-emerald-600 mb-4" /><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Mensinkronisasi Data Client...</p></div>;

  return (
    <div className="flex flex-col gap-6 h-full text-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative min-w-[300px] max-w-[400px]">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
             <input 
               type="text" 
               placeholder="Cari client atau perusahaan..." 
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="w-full pl-11 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-lg outline-none focus:bg-white transition-all text-[11px] font-bold" 
             />
          </div>
          {selectedIds.length > 0 && (
            <button 
              onClick={() => setIsConfirmBulkOpen(true)}
              className="px-4 py-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-rose-600 hover:text-white transition-all animate-in zoom-in-95"
            >
              <Trash2 size={14} /> Hapus {selectedIds.length} Client
            </button>
          )}
        </div>
        <button 
          onClick={() => { 
            setForm({ salutation: '', name: '', client_company_id: null, email: '', whatsapp: '' }); 
            setIsAddingCo(false);
            setIsAddingCatInCo(false);
            setIsModalOpen(true); 
          }}
          className="px-6 py-3.5 bg-emerald-600 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
        >
          <Plus size={14} /> Client Baru
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm flex-1 min-h-[400px]">
        <div className="overflow-x-auto h-full custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-5 border-b border-gray-100 w-12 text-center">
                  <button onClick={toggleSelectAll} className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all mx-auto ${selectedIds.length > 0 && selectedIds.length === clientsWithData.length ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-gray-200 text-transparent'}`}>
                    <Check size={12} strokeWidth={4} />
                  </button>
                </th>
                <th onClick={() => handleSort('name')} className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 cursor-pointer group">
                  <div className="flex items-center">Client / Kontak <SortIcon col="name" /></div>
                </th>
                <th onClick={() => handleSort('company')} className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 cursor-pointer group">
                   <div className="flex items-center">Perusahaan <SortIcon col="company" /></div>
                </th>
                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Kontak Detail</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clientsWithData.map(item => (
                <tr key={item.id} className={`hover:bg-gray-50/30 group transition-colors ${selectedIds.includes(item.id) ? 'bg-emerald-50/30' : ''}`}>
                  <td className="px-6 py-6 text-center">
                    <button onClick={() => toggleSelect(item.id)} className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all mx-auto ${selectedIds.includes(item.id) ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-gray-200 text-transparent'}`}>
                      <Check size={12} strokeWidth={4} />
                    </button>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-bold text-[10px]">
                        {item.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 tracking-tight">
                            {item.salutation && <span className="text-emerald-500 mr-1 font-bold">{item.salutation}</span>}
                            {item.name}
                        </p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase mt-1 tracking-tighter italic">ID: {String(item.id).padStart(4, '0')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    {item.client_company ? (
                        <div className="flex items-center gap-2">
                             <Building size={12} className="text-indigo-400" />
                             <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-tight">{item.client_company.name}</span>
                        </div>
                    ) : (
                        <span className="text-[9px] font-bold uppercase tracking-tighter text-gray-300 italic">Personal</span>
                    )}
                  </td>
                  <td className="px-6 py-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-600 flex items-center gap-2"><Mail size={12} className="text-gray-300" /> {item.email || '-'}</p>
                      <p className="text-[10px] font-bold text-gray-600 flex items-center gap-2"><Phone size={12} className="text-gray-300" /> {item.whatsapp || '-'}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setForm(item); setIsAddingCo(false); setIsModalOpen(true); }} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg"><Edit2 size={16} /></button>
                      <button onClick={() => setConfirmDelete({ isOpen: true, id: item.id, name: item.name })} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {clientsWithData.length === 0 && (
                <tr>
                   <td colSpan={5} className="py-24 text-center">
                      <Contact size={48} className="mx-auto mb-4 opacity-10 text-gray-400" />
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-300">Belum ada data client</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={form.id ? "Edit Data Client" : "Tambah Client Baru"}
        size="lg"
        footer={<button onClick={handleSave} disabled={isProcessing} className="px-10 py-4 bg-emerald-600 text-white rounded-lg font-bold text-xs uppercase tracking-widest shadow-xl flex items-center gap-2">{isProcessing && <Loader2 className="animate-spin" size={14} />} Simpan Client</button>}
      >
        <div className="flex flex-col gap-6 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Sapaan</label>
                <select value={form.salutation} onChange={e => setForm({...form, salutation: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-lg font-bold outline-none cursor-pointer">
                  <option value="">Pilih Sapaan</option>
                  <option value="Bapak">Bapak</option>
                  <option value="Ibu">Ibu</option>
                </select>
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nama Lengkap Client</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-lg font-bold outline-none focus:bg-white focus:border-emerald-500 transition-all shadow-sm" placeholder="John Doe..." />
            </div>

            <div className="md:col-span-2 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pilih Perusahaan Client</label>
                  <button 
                    type="button" 
                    onClick={() => { setIsAddingCo(!isAddingCo); setIsAddingCatInCo(false); }}
                    className="text-[9px] font-bold text-indigo-600 uppercase hover:underline transition-all"
                  >
                    {isAddingCo ? 'Batal' : '+ Perusahaan Baru'}
                  </button>
                </div>
                
                {isAddingCo ? (
                  <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-4 animate-in zoom-in-95 duration-200 shadow-inner">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-[9px] font-bold text-gray-400 uppercase">Nama Perusahaan*</label>
                              <input 
                                  type="text" 
                                  value={newCo.name} 
                                  onChange={e => setNewCo({...newCo, name: e.target.value})}
                                  className="w-full px-4 py-2.5 bg-white border border-indigo-100 rounded-lg font-bold text-xs outline-none"
                                  placeholder="PT Contoh Jaya"
                              />
                          </div>
                          <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                  <label className="text-[9px] font-bold text-gray-400 uppercase">Kategori*</label>
                                  <button type="button" onClick={() => setIsAddingCatInCo(!isAddingCatInCo)} className="text-[8px] font-bold text-indigo-600 uppercase hover:underline">
                                    {isAddingCatInCo ? 'Batal' : '+ Kategori Baru'}
                                  </button>
                              </div>
                              {isAddingCatInCo ? (
                                <div className="flex gap-2">
                                    <input 
                                        autoFocus
                                        type="text" 
                                        value={newCatInCoName}
                                        onChange={e => setNewCatInCoName(e.target.value)}
                                        className="flex-1 px-3 py-2 bg-white border border-indigo-100 rounded-lg font-bold text-[10px] outline-none"
                                        placeholder="Kategori..."
                                    />
                                    <button type="button" onClick={handleQuickAddCatInCo} disabled={catInCoProcessing || !newCatInCoName.trim()} className="px-3 bg-indigo-600 text-white rounded-lg">
                                        {catInCoProcessing ? <Loader2 size={12} className="animate-spin" /> : <Check size={14} />}
                                    </button>
                                </div>
                              ) : (
                                <select 
                                    value={newCo.category_id} 
                                    onChange={e => setNewCo({...newCo, category_id: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-white border border-indigo-100 rounded-lg font-bold text-xs outline-none cursor-pointer"
                                >
                                    <option value="">-- Pilih Kategori --</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                              )}
                          </div>
                          <div className="md:col-span-2 space-y-1">
                              <label className="text-[9px] font-bold text-gray-400 uppercase">Alamat Perusahaan*</label>
                              <input type="text" value={newCo.address} onChange={e => setNewCo({...newCo, address: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-indigo-100 rounded-lg font-bold text-xs outline-none" placeholder="Alamat..." />
                          </div>
                      </div>
                      <button 
                          type="button"
                          disabled={coProcessing}
                          onClick={handleQuickAddCo}
                          className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all"
                      >
                          {coProcessing ? <Loader2 size={12} className="animate-spin" /> : <Save size={14} />} SIMPAN & PILIH PERUSAHAAN
                      </button>
                  </div>
                ) : (
                  <select value={form.client_company_id || ''} onChange={e => setForm({...form, client_company_id: e.target.value ? Number(e.target.value) : null})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-lg font-bold outline-none cursor-pointer focus:bg-white transition-all shadow-sm">
                      <option value="">-- Personal / Tanpa Perusahaan --</option>
                      {clientCompanies.map(co => (
                          <option key={co.id} value={co.id}>{co.name}</option>
                      ))}
                  </select>
                )}
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Client</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-lg font-bold outline-none shadow-sm focus:bg-white" placeholder="client@email.com" />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">WhatsApp Client</label>
                <input type="text" value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-lg font-bold outline-none shadow-sm focus:bg-white" placeholder="08..." />
            </div>
          </div>

          {selectedCoDetails && !isAddingCo && (
             <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-xl flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-400">
                <div className="flex items-center gap-2 text-indigo-600">
                    <span className="text-[10px] font-bold uppercase tracking-widest">Informasi Perusahaan</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Kategori</p>
                        <div className="flex items-center gap-2">
                            <Tags size={12} className="text-indigo-400" />
                            <p className="text-xs font-bold text-gray-700 uppercase">{selectedCoDetails.client_company_categories?.name || 'Umum'}</p>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Alamat</p>
                        <div className="flex items-center gap-2">
                            <MapPin size={12} className="text-indigo-400 shrink-0" />
                            <p className="text-xs font-bold text-gray-600 truncate">{selectedCoDetails.address || '-'}</p>
                        </div>
                    </div>
                </div>
             </div>
          )}
        </div>
      </Modal>

      {/* CUSTOM CONFIRM DELETE MODAL */}
      <Modal 
        isOpen={confirmDelete.isOpen} 
        onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })} 
        title="Hapus Data Client"
        size="sm"
      >
        <div className="flex flex-col items-center py-6 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6">
             <AlertTriangle size={32} />
          </div>
          <p className="text-lg font-bold text-gray-900 tracking-tight">Hapus Client?</p>
          <p className="text-sm text-gray-500 font-medium leading-relaxed mt-2 mb-8">
             Anda akan menghapus data <strong>{confirmDelete.name}</strong> secara permanen. Seluruh riwayat transaksi yang terhubung dengan client ini mungkin terpengaruh.
          </p>
          <div className="flex w-full gap-3">
             <button 
               onClick={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
               className="flex-1 py-4 bg-gray-100 text-gray-400 font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-gray-200 transition-all"
             >
               Batal
             </button>
             <button 
               onClick={executeDelete}
               disabled={isProcessing}
               className="flex-1 py-4 bg-rose-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg shadow-lg shadow-rose-100 hover:bg-rose-700 active:scale-95 transition-all flex items-center justify-center gap-2"
             >
               {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />} Ya, Hapus
             </button>
          </div>
        </div>
      </Modal>

      {/* CUSTOM CONFIRM BULK DELETE MODAL */}
      <Modal 
        isOpen={isConfirmBulkOpen} 
        onClose={() => setIsConfirmBulkOpen(false)} 
        title="Hapus Masal Client"
        size="sm"
      >
        <div className="flex flex-col items-center py-6 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6">
             <AlertTriangle size={32} />
          </div>
          <p className="text-lg font-bold text-gray-900 tracking-tight">Hapus {selectedIds.length} Client?</p>
          <p className="text-sm text-gray-500 font-medium leading-relaxed mt-2 mb-8">
             Apakah Anda yakin ingin menghapus seluruh client yang dipilih secara permanen? Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex w-full gap-3">
             <button 
               onClick={() => setIsConfirmBulkOpen(false)}
               className="flex-1 py-4 bg-gray-100 text-gray-400 font-bold text-[10px] uppercase tracking-widest rounded-lg"
             >
               Batal
             </button>
             <button 
               onClick={handleBulkDelete}
               disabled={isProcessing}
               className="flex-1 py-4 bg-rose-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg shadow-lg shadow-rose-100"
             >
               {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />} Hapus Semua
             </button>
          </div>
        </div>
      </Modal>

      {/* NOTIFICATION MODAL */}
      <Modal 
        isOpen={notification.isOpen} 
        onClose={() => setNotification({ ...notification, isOpen: false })} 
        title=""
        size="sm"
      >
        <div className="flex flex-col items-center py-6 text-center">
           <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={32} /> : <X size={32} />}
           </div>
           <h3 className="text-lg font-bold text-gray-900 mb-2">{notification.title}</h3>
           <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">
             {notification.message}
           </p>
           <button 
             onClick={() => setNotification({ ...notification, isOpen: false })}
             className="w-full py-4 bg-gray-900 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-black transition-all"
           >
             Tutup
           </button>
        </div>
      </Modal>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
};
