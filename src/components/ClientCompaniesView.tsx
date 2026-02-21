'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, ClientCompany, ClientCompanyCategory } from '@/lib/types';
import { 
  Plus, Search, Edit2, Trash2, Loader2, Factory, 
  MapPin, Mail, Phone, ChevronRight, X, Save, Check, Tags,
  ArrowUpDown, ChevronUp, ChevronDown, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { Modal } from '@/components/Modal';

interface Props {
  company: Company;
}

type SortKey = 'name' | 'category' | 'email' | 'id';
type SortConfig = { key: SortKey; direction: 'asc' | 'desc' } | null;

export const ClientCompaniesView: React.FC<Props> = ({ company }) => {
  const [rawItems, setRawItems] = useState<ClientCompany[]>([]);
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
  
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [catProcessing, setCatProcessing] = useState(false);

  const [form, setForm] = useState<Partial<ClientCompany>>({
    name: '', category_id: null, address: '', email: '', whatsapp: ''
  });

  const fetchData = useCallback(async () => {
    if (!company?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [cosRes, catsRes] = await Promise.all([
        supabase.from('client_companies').select('*').eq('company_id', company.id).order('name'),
        supabase.from('client_company_categories').select('*').eq('company_id', company.id).order('name')
      ]);

      if (cosRes.error) throw cosRes.error;
      if (catsRes.error) throw catsRes.error;

      if (cosRes.data) setRawItems(cosRes.data as any);
      if (catsRes.data) setCategories(catsRes.data);
      setSelectedIds([]);
    } catch (err) {
      console.error("Fetch Data Error:", err);
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const items = useMemo(() => {
    let result = rawItems.map(item => ({
      ...item,
      client_company_categories: categories.find(cat => cat.id === item.category_id)
    }));

    if (searchTerm) {
      result = result.filter(i => 
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (i.client_company_categories?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sortConfig) {
      result.sort((a, b) => {
        let valA: any, valB: any;
        switch(sortConfig.key) {
          case 'name': valA = a.name; valB = b.name; break;
          case 'category': valA = a.client_company_categories?.name || ''; valB = b.client_company_categories?.name || ''; break;
          case 'email': valA = a.email || ''; valB = b.email || ''; break;
          default: valA = a.id; valB = b.id;
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [rawItems, categories, searchTerm, sortConfig]);

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
    if (selectedIds.length === items.length) setSelectedIds([]);
    else setSelectedIds(items.map(i => i.id));
  };

  const showNotification = (title: string, message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ isOpen: true, title, message, type });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('client_companies').delete().in('id', selectedIds);
      if (error) throw error;
      await fetchData();
      setIsConfirmBulkOpen(false);
      showNotification('Berhasil', `Berhasil menghapus ${selectedIds.length} data perusahaan.`);
    } catch (err: any) {
      showNotification('Gagal Menghapus', err.message || "Beberapa data tidak dapat dihapus karena masih terhubung dengan data lain.", 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickAddCategory = async () => {
    if (!newCatName.trim()) return;
    setCatProcessing(true);
    try {
      const { data, error } = await supabase
        .from('client_company_categories')
        .insert({ name: newCatName.trim(), company_id: company.id })
        .select()
        .single();
      if (error) throw error;
      
      const { data: freshCats } = await supabase
        .from('client_company_categories')
        .select('*')
        .eq('company_id', company.id)
        .order('name');
      
      if (freshCats) setCategories(freshCats);
      setForm(prev => ({ ...prev, category_id: data.id }));
      setNewCatName('');
      setIsAddingCategory(false);
    } catch (err: any) {
      showNotification('Gagal', err.message, 'error');
    } finally {
      setCatProcessing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.category_id || !form.address) {
        showNotification('Data Tidak Lengkap', "Harap isi field wajib (Nama, Kategori, Alamat).", 'error');
        return;
    }
    setIsProcessing(true);
    try {
      const payload = { 
          name: form.name,
          category_id: form.category_id,
          address: form.address,
          email: form.email,
          whatsapp: form.whatsapp,
          company_id: company.id
      };
      if (form.id) await supabase.from('client_companies').update(payload).eq('id', form.id);
      else await supabase.from('client_companies').insert(payload);
      setIsModalOpen(false);
      await fetchData();
      showNotification('Tersimpan', `Data perusahaan ${form.name} berhasil diperbarui.`);
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
      const { error } = await supabase.from('client_companies').delete().eq('id', confirmDelete.id);
      if (error) throw error;
      await fetchData();
      setConfirmDelete({ isOpen: false, id: null, name: '' });
      showNotification('Berhasil Dihapus', `Data perusahaan ${confirmDelete.name} telah dihapus.`);
    } catch (err: any) {
      showNotification('Gagal Menghapus', "Data tidak dapat dihapus karena masih memiliki Client yang terhubung. Hapus client terlebih dahulu.", 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortConfig?.key !== col) return <ArrowUpDown size={12} className="ml-1 opacity-20" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={12} className="ml-1 text-indigo-600" /> : <ChevronDown size={12} className="ml-1 text-indigo-600" />;
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-indigo-600 mb-4" /><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Mensinkronisasi Data Perusahaan...</p></div>;

  return (
    <div className="flex flex-col gap-6 h-full text-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative min-w-[300px] max-w-[400px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
            <input 
              type="text" 
              placeholder="Cari perusahaan..." 
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
              <Trash2 size={14} /> Hapus {selectedIds.length} Item
            </button>
          )}
        </div>
        <button 
          onClick={() => { setForm({ name: '', category_id: null, address: '', email: '', whatsapp: '' }); setIsAddingCategory(false); setIsModalOpen(true); }}
          className="px-6 py-3.5 bg-indigo-600 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Plus size={14} /> Perusahaan Baru
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm flex-1 min-h-[400px]">
        <div className="overflow-x-auto h-full custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-5 border-b border-gray-100 w-12 text-center">
                  <button onClick={toggleSelectAll} className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all mx-auto ${selectedIds.length > 0 && selectedIds.length === items.length ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-transparent'}`}>
                    <Check size={12} strokeWidth={4} />
                  </button>
                </th>
                <th onClick={() => handleSort('name')} className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 cursor-pointer group">
                  <div className="flex items-center">Nama Perusahaan <SortIcon col="name" /></div>
                </th>
                <th onClick={() => handleSort('category')} className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 cursor-pointer group">
                  <div className="flex items-center">Kategori <SortIcon col="category" /></div>
                </th>
                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Kontak</th>
                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(item => (
                <tr key={item.id} className={`hover:bg-gray-50/30 group transition-colors ${selectedIds.includes(item.id) ? 'bg-indigo-50/30' : ''}`}>
                  <td className="px-6 py-6 text-center">
                    <button onClick={() => toggleSelect(item.id)} className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all mx-auto ${selectedIds.includes(item.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-transparent'}`}>
                      <Check size={12} strokeWidth={4} />
                    </button>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center"><Factory size={20} /></div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 tracking-tight">{item.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 flex items-center gap-1"><MapPin size={10} /> {item.address || '-'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <span className="px-3 py-1 bg-white border border-gray-100 rounded-full text-[9px] font-bold uppercase tracking-tighter text-gray-500 shadow-sm">
                        {item.client_company_categories?.name || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-600 flex items-center gap-2"><Mail size={12} className="text-gray-300" /> {item.email || '-'}</p>
                      <p className="text-[10px] font-bold text-gray-600 flex items-center gap-2"><Phone size={12} className="text-gray-300" /> {item.whatsapp || '-'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setForm(item); setIsAddingCategory(false); setIsModalOpen(true); }} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg"><Edit2 size={16} /></button>
                      <button onClick={() => setConfirmDelete({ isOpen: true, id: item.id, name: item.name })} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={5} className="py-24 text-center text-gray-300 font-bold uppercase text-[10px] tracking-widest italic opacity-30">Tidak ada data perusahaan</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={form.id ? "Edit Perusahaan" : "Tambah Perusahaan Baru"}
        size="lg"
        footer={<button onClick={handleSave} disabled={isProcessing} className="px-10 py-4 bg-indigo-600 text-white rounded-lg font-bold text-xs uppercase tracking-widest shadow-xl flex items-center gap-2">{isProcessing && <Loader2 className="animate-spin" size={14} />} Simpan Data</button>}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 pb-4">
           <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nama Perusahaan*</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-lg font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-sm" />
           </div>
           <div className="space-y-2">
              <div className="flex items-center justify-between">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Kategori*</label>
                 <button type="button" onClick={() => setIsAddingCategory(!isAddingCategory)} className="text-[8px] font-bold text-indigo-600 uppercase hover:underline">{isAddingCategory ? 'Batal' : '+ Kategori'}</button>
              </div>
              {isAddingCategory ? (
                <div className="flex gap-2">
                   <input autoFocus type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="flex-1 px-4 py-3 bg-gray-50 border border-indigo-100 rounded-lg font-bold text-xs" />
                   <button onClick={handleQuickAddCategory} disabled={catProcessing} className="px-3 bg-indigo-600 text-white rounded-lg">{catProcessing ? <Loader2 size={12} className="animate-spin" /> : <Check size={14} />}</button>
                </div>
              ) : (
                <select value={form.category_id || ''} onChange={e => setForm({...form, category_id: Number(e.target.value)})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-lg font-bold outline-none cursor-pointer">
                  <option value="">Pilih Kategori</option>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              )}
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Perusahaan</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-lg font-bold outline-none shadow-sm focus:bg-white focus:border-indigo-500 transition-all" />
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">WhatsApp / No. Telp</label>
              <input type="text" value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-lg font-bold outline-none shadow-sm focus:bg-white focus:border-indigo-500 transition-all" placeholder="08..." />
           </div>
           <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Alamat Kantor*</label>
              <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-lg font-medium h-32 outline-none resize-none focus:bg-white focus:border-indigo-500 shadow-sm transition-all" />
           </div>
        </div>
      </Modal>

      {/* CUSTOM CONFIRM DELETE MODAL */}
      <Modal 
        isOpen={confirmDelete.isOpen} 
        onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })} 
        title="Hapus Perusahaan"
        size="sm"
      >
        <div className="flex flex-col items-center py-6 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6">
             <AlertTriangle size={32} />
          </div>
          <p className="text-lg font-bold text-gray-900 tracking-tight">Hapus {confirmDelete.name}?</p>
          <p className="text-sm text-gray-500 font-medium leading-relaxed mt-2 mb-8">
             Tindakan ini permanen. Pastikan tidak ada data client yang masih terhubung dengan perusahaan ini sebelum menghapus.
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
        title="Hapus Masal"
        size="sm"
      >
        <div className="flex flex-col items-center py-6 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6">
             <AlertTriangle size={32} />
          </div>
          <p className="text-lg font-bold text-gray-900 tracking-tight">Konfirmasi Penghapusan</p>
          <p className="text-sm text-gray-500 font-medium leading-relaxed mt-2 mb-8">
             Apakah Anda yakin ingin menghapus {selectedIds.length} perusahaan yang dipilih secara permanen?
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
               className="flex-1 py-4 bg-rose-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg shadow-lg"
             >
               {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />} Hapus Masal
             </button>
          </div>
        </div>
      </Modal>

      {/* NOTIFICATION MODAL */}
      <Modal isOpen={notification.isOpen} onClose={() => setNotification({ ...notification, isOpen: false })} title="" size="sm">
        <div className="flex flex-col items-center py-6 text-center">
           <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{notification.type === 'success' ? <CheckCircle2 size={32} /> : <X size={32} />}</div>
           <h3 className="text-lg font-bold text-gray-900 mb-2">{notification.title}</h3>
           <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">{notification.message}</p>
           <button onClick={() => setNotification({ ...notification, isOpen: false })} className="w-full py-4 bg-gray-900 text-white font-bold text-[10px] uppercase rounded-lg hover:bg-black transition-all">Tutup</button>
        </div>
      </Modal>
    </div>
  );
};
