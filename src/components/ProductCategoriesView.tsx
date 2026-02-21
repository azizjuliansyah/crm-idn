'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, ProductCategory } from '@/lib/types';
import { 
  Plus, Edit2, Trash2, Loader2, Tags, AlertTriangle, X, CheckCircle2
} from 'lucide-react';
import { Modal } from './Modal';

interface Props {
  company: Company | null;
}

export const ProductCategoriesView: React.FC<Props> = ({ company }) => {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [form, setForm] = useState<Partial<ProductCategory>>({ name: '' });

  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null; name: string }>({ isOpen: false, id: null, name: '' });
  const [notification, setNotification] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' }>({ 
    isOpen: false, title: '', message: '', type: 'success' 
  });

  const fetchData = useCallback(async () => {
    if (!company?.id) {
        setLoading(false);
        return;
    }
    setLoading(true);
    try {
      const { data } = await supabase
        .from('product_categories')
        .select('*')
        .eq('company_id', company.id)
        .order('name');
      if (data) setCategories(data);
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (!form.name?.trim()) return;
    setIsProcessing(true);
    try {
      if (form.id) {
        await supabase.from('product_categories').update({ name: form.name.trim() }).eq('id', form.id);
      } else {
        await supabase.from('product_categories').insert({ name: form.name.trim(), company_id: company.id });
      }
      setIsModalOpen(false);
      fetchData();
      setNotification({ isOpen: true, title: 'Berhasil', message: 'Kategori produk telah disimpan.', type: 'success' });
    } catch (err: any) {
      setNotification({ isOpen: true, title: 'Gagal', message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteClick = (cat: ProductCategory) => {
    setConfirmDelete({ isOpen: true, id: cat.id, name: cat.name });
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('product_categories').delete().eq('id', confirmDelete.id);
      if (error) throw error;
      setConfirmDelete({ isOpen: false, id: null, name: '' });
      fetchData();
    } catch (err: any) {
      setNotification({ isOpen: true, title: 'Gagal Menghapus', message: 'Data tidak dapat dihapus karena masih digunakan oleh produk lain.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-blue-600 mb-4" /><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Memuat Kategori...</p></div>;
  if (!company) return <div className="text-center p-8 text-gray-500">Pilih workspace terlebih dahulu</div>;

  return (
    <div className="max-w-2xl space-y-8 animate-in fade-in duration-500 text-gray-900">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-10 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 tracking-tighter">Kategori Produk</h3>
            <p className="text-sm text-gray-400 font-medium mt-1">Klasifikasikan produk dan jasa Anda.</p>
          </div>
          <button 
            onClick={() => { setForm({ name: '' }); setIsModalOpen(true); }}
            className="px-6 py-3.5 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus size={16} /> Kategori Baru
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-10 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nama Kategori</th>
                <th className="px-10 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categories.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/30 group">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                        <Tags size={16} />
                      </div>
                      <span className="text-sm font-bold text-gray-900 tracking-tight">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setForm(item); setIsModalOpen(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeleteClick(item)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr><td colSpan={2} className="py-20 text-center text-gray-300 font-bold uppercase text-[10px] tracking-widest">Tidak ada kategori terdaftar</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={form.id ? "Edit Kategori" : "Tambah Kategori Baru"}
        size="md"
        footer={<button onClick={handleSave} disabled={isProcessing} className="px-10 py-4 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl flex items-center gap-2">{isProcessing && <Loader2 className="animate-spin" size={14} />} Simpan Kategori</button>}
      >
        <div className="space-y-4 pb-2">
           <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nama Kategori</label>
              <input 
                type="text" 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})} 
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm" 
                placeholder="Misal: Perangkat Keras, Langganan Bulanan..." 
              />
           </div>
        </div>
      </Modal>

      {/* CONFIRM DELETE MODAL */}
      <Modal 
        isOpen={confirmDelete.isOpen} 
        onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })} 
        title="Hapus Kategori"
        size="sm"
      >
        <div className="flex flex-col items-center py-6 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6">
             <AlertTriangle size={32} />
          </div>
          <p className="text-lg font-bold text-gray-900 tracking-tight">Hapus kategori {confirmDelete.name}?</p>
          <p className="text-sm text-gray-500 font-medium leading-relaxed mt-2 mb-8">
             Tindakan ini permanen. Pastikan tidak ada produk yang terhubung dengan kategori ini.
          </p>
          <div className="flex w-full gap-3">
             <button onClick={() => setConfirmDelete({ isOpen: false, id: null, name: '' })} className="flex-1 py-4 bg-gray-100 text-gray-400 font-bold text-[10px] uppercase rounded-xl">Batal</button>
             <button onClick={executeDelete} disabled={isProcessing} className="flex-1 py-4 bg-rose-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl shadow-lg flex items-center justify-center gap-2">{isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />} Ya, Hapus</button>
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
