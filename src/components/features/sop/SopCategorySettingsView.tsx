'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, SopCategory } from '@/lib/types';
import { 
  Plus, Edit2, Trash2, Loader2, Tags, Save, AlertTriangle, 
  X, CheckCircle2, List, Building2, ArrowUp, ArrowDown, GripVertical,
  CornerDownRight
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

interface Props {
  company: Company;
}

export const SopCategorySettingsView: React.FC<Props> = ({ company }) => {
  const [categories, setCategories] = useState<SopCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [form, setForm] = useState<Partial<SopCategory>>({ name: '', parent_id: null });

  const fetchData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sop_categories')
        .select('*')
        .eq('company_id', company.id)
        .order('sort_order', { ascending: true });
      
      if (error) {
        if (error.message.includes('sort_order')) {
            const { data: fallbackData } = await supabase
                .from('sop_categories')
                .select('*')
                .eq('company_id', company.id);
            if (fallbackData) setCategories(fallbackData as any);
        } else {
            throw error;
        }
      } else if (data) {
        setCategories(data as any);
      }
    } catch (err) {
      console.error("Error fetching SOP categories:", err);
    } finally {
      setLoading(false);
    }
  }, [company.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddClick = () => {
    setForm({ name: '', parent_id: null });
    setIsModalOpen(true);
  };

  const handleEditClick = (cat: SopCategory) => {
    setForm(cat);
    setIsModalOpen(true);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form.name?.trim()) return;

    setIsProcessing(true);
    try {
      const payload = {
        name: form.name.trim(),
        parent_id: form.parent_id || null,
        company_id: company.id
      };

      if (form.id) {
        const { error } = await supabase.from('sop_categories').update(payload).eq('id', form.id);
        if (error) throw error;
      } else {
        const validOrders = categories.map(c => Number(c.sort_order) || 0);
        const nextOrder = validOrders.length > 0 ? Math.max(...validOrders) + 1 : 1;
        
        const { error } = await supabase.from('sop_categories').insert({ 
          ...payload,
          sort_order: nextOrder
        });
        if (error) throw error;
      }
      
      setIsModalOpen(false);
      await fetchData();
      window.dispatchEvent(new Event('sopCategoriesUpdated'));
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus kategori ini? Seluruh SOP terkait akan kehilangan kategorinya.")) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('sop_categories').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
      window.dispatchEvent(new Event('sopCategoriesUpdated'));
    } catch (err: any) {
      alert("Gagal menghapus: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === categories.length - 1)) return;

    const newCategories = [...categories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    const currentOrder = Number(newCategories[index].sort_order) || 0;
    const targetOrder = Number(newCategories[targetIndex].sort_order) || 0;
    
    newCategories[index].sort_order = targetOrder;
    newCategories[targetIndex].sort_order = currentOrder;

    setCategories([...newCategories].sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0)));
    setIsProcessing(true);

    try {
      await Promise.all([
        supabase.from('sop_categories').update({ sort_order: newCategories[index].sort_order }).eq('id', newCategories[index].id),
        supabase.from('sop_categories').update({ sort_order: newCategories[targetIndex].sort_order }).eq('id', newCategories[targetIndex].id)
      ]);
      window.dispatchEvent(new Event('sopCategoriesUpdated'));
    } catch (err: any) {
      console.error("Gagal memperbarui urutan:", err);
      fetchData();
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper untuk mendapatkan nama induk
  const getParentName = (parentId: number | null) => {
    if (!parentId) return null;
    return categories.find(c => c.id === parentId)?.name;
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-3xl space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
           <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Kategori Prosedur (Divisi)</h3>
              <p className="text-xs text-gray-400 font-medium">Kelola klasifikasi utama dan sub-kategori SOP.</p>
           </div>
           <button 
            onClick={handleAddClick} 
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-all active:scale-95"
           >
             <Plus size={14} /> Kategori Baru
           </button>
        </div>
        <div className="p-6 space-y-3">
           {categories.map((cat, idx) => {
              const hasParent = !!cat.parent_id;
              return (
                <div key={cat.id} className={`flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl hover:border-blue-200 transition-all group ${hasParent ? 'ml-10 border-dashed bg-white' : ''}`}>
                   <div className="flex items-center gap-4">
                      <div className="text-gray-300">
                         {hasParent ? <CornerDownRight size={16} className="text-blue-400" /> : <GripVertical size={18} />}
                      </div>
                      <div className={`w-9 h-9 bg-white border border-gray-100 rounded-lg flex items-center justify-center text-blue-600 shadow-sm ${hasParent ? 'w-7 h-7' : ''}`}>
                        <Tags size={hasParent ? 12 : 16} />
                      </div>
                      <div>
                        <span className={`font-black tracking-tight ${hasParent ? 'text-xs text-gray-500' : 'text-sm text-gray-700'}`}>{cat.name}</span>
                        {hasParent && (
                          <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mt-0.5">Sub dari: {getParentName(cat.parent_id)}</p>
                        )}
                      </div>
                   </div>
                   <div className="flex items-center gap-1">
                      {!hasParent && (
                        <div className="flex items-center gap-1 mr-4">
                          <button 
                            onClick={() => handleMove(idx, 'up')} 
                            disabled={idx === 0 || isProcessing}
                            className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600 disabled:opacity-30 transition-all shadow-sm"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button 
                            onClick={() => handleMove(idx, 'down')} 
                            disabled={idx === categories.length - 1 || isProcessing}
                            className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600 disabled:opacity-30 transition-all shadow-sm"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
                      )}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEditClick(cat)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(cat.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                      </div>
                   </div>
                </div>
              );
           })}
           {categories.length === 0 && (
             <div className="py-20 text-center text-gray-300">
                <Tags size={48} className="mx-auto mb-4 opacity-10" />
                <p className="text-xs font-black uppercase tracking-widest">Belum ada kategori</p>
             </div>
           )}
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={form.id ? "Edit Kategori" : "Tambah Kategori SOP"}
        footer={
          <button 
            onClick={() => handleSave()} 
            disabled={isProcessing || !form.name?.trim()} 
            className="px-8 py-3.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} 
            Simpan Kategori
          </button>
        }
      >
         <div className="space-y-6 py-2">
            <div className="space-y-2">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nama Kategori / Divisi</label>
               <input 
                type="text" 
                value={form.name || ''} 
                onChange={e => setForm({...form, name: e.target.value})} 
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner" 
                placeholder="Misal: Departemen Keuangan..." 
               />
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Induk Kategori (Opsional)</label>
               <select 
                value={form.parent_id || ''} 
                onChange={e => setForm({...form, parent_id: e.target.value ? Number(e.target.value) : null})}
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner cursor-pointer"
               >
                 <option value="">-- Tanpa Induk (Kategori Utama) --</option>
                 {categories
                   .filter(c => !c.parent_id && c.id !== form.id) // Hindari sirkular dan nesting lebih dari 2 level
                   .map(c => (
                     <option key={c.id} value={c.id}>{c.name}</option>
                   ))
                 }
               </select>
               <p className="text-[9px] text-gray-400 italic px-1">Pilih induk jika kategori ini merupakan bagian dari divisi/departemen lain.</p>
            </div>
         </div>
      </Modal>
    </div>
  );
};
