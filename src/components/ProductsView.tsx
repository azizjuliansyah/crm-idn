'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, Product, ProductCategory, ProductUnit } from '@/lib/types';
import { 
  Plus, Search, Edit2, Trash2, Loader2, Package, 
  Tags, Weight, FileText, Check, X, CheckCircle2
} from 'lucide-react';
import { Modal } from './Modal';

interface Props {
  company: Company | null;
}

export const ProductsView: React.FC<Props> = ({ company }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Quick Add State
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');

  const [form, setForm] = useState<Partial<Product>>({
    name: '', category_id: null, unit_id: null, price: 0, description: ''
  });

  const fetchData = useCallback(async () => {
    if (!company?.id) {
        setLoading(false);
        return;
    }
    setLoading(true);
    try {
      const [prodRes, catRes, unitRes] = await Promise.all([
        supabase.from('products').select('*, product_categories(*), product_units(*)').eq('company_id', company.id).order('name'),
        supabase.from('product_categories').select('*').eq('company_id', company.id).order('name'),
        supabase.from('product_units').select('*').eq('company_id', company.id).order('name')
      ]);

      if (prodRes.data) setProducts(prodRes.data);
      if (catRes.data) setCategories(catRes.data);
      if (unitRes.data) setUnits(unitRes.data);
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.product_categories?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const handleQuickAddCategory = async () => {
    if (!company) return;
    if (!newCatName.trim()) return;
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .insert({ name: newCatName.trim(), company_id: company.id })
        .select()
        .single();
      if (error) throw error;
      setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm(prev => ({ ...prev, category_id: data.id }));
      setNewCatName('');
      setIsAddingCat(false);
    } catch (err: any) { alert(err.message); }
  };

  const handleQuickAddUnit = async () => {
    if (!company) return;
    if (!newUnitName.trim()) return;
    try {
      const { data, error } = await supabase
        .from('product_units')
        .insert({ name: newUnitName.trim(), company_id: company.id })
        .select()
        .single();
      if (error) throw error;
      setUnits(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm(prev => ({ ...prev, unit_id: data.id }));
      setNewUnitName('');
      setIsAddingUnit(false);
    } catch (err: any) { alert(err.message); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (!form.name || !form.price) return;
    setIsProcessing(true);
    try {
      const payload = { ...form, company_id: company.id };
      delete (payload as any).product_categories;
      delete (payload as any).product_units;

      if (form.id) await supabase.from('products').update(payload).eq('id', form.id);
      else await supabase.from('products').insert(payload);
      
      setIsModalOpen(false);
      fetchData();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus produk ini?")) return;
    await supabase.from('products').delete().eq('id', id);
    fetchData();
  };

  const formatIDR = (num: number = 0) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num).replace('Rp', 'Rp ');
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-emerald-600 mb-4" /><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sinkronisasi Katalog Produk...</p></div>;
  if (!company) return <div className="text-center p-8 text-gray-500">Pilih workspace terlebih dahulu</div>;

  return (
    <div className="space-y-6 h-full flex flex-col text-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative min-w-[300px] max-w-[400px] flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
          <input 
            type="text" 
            placeholder="Cari nama produk atau kategori..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl outline-none focus:bg-white transition-all text-[11px] font-bold" 
          />
        </div>
        <button 
          onClick={() => { setForm({ name: '', category_id: categories[0]?.id || null, unit_id: units[0]?.id || null, price: 0, description: '' }); setIsModalOpen(true); }}
          className="px-6 py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
        >
          <Plus size={14} /> Produk Baru
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex-1">
        <div className="overflow-x-auto h-full custom-scrollbar">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-gray-50/90 backdrop-blur-sm z-10">
              <tr>
                <th className="px-10 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Informasi Produk</th>
                <th className="px-10 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Kategori</th>
                <th className="px-10 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Satuan</th>
                <th className="px-10 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Harga Jual</th>
                <th className="px-10 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProducts.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/30 group">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center"><Package size={20} /></div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 tracking-tight">{item.name}</p>
                        {item.description && <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1 italic">{item.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <span className="px-3 py-1 bg-white border border-gray-100 rounded-full text-[9px] font-bold uppercase tracking-tighter text-gray-500 shadow-sm">
                      {item.product_categories?.name || 'Umum'}
                    </span>
                  </td>
                  <td className="px-10 py-6">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.product_units?.name || '-'}</span>
                  </td>
                  <td className="px-10 py-6 text-right font-bold text-emerald-600 text-sm">{formatIDR(item.price)}</td>
                  <td className="px-10 py-6 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setForm(item); setIsModalOpen(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr><td colSpan={5} className="py-24 text-center text-gray-300 font-bold uppercase text-[10px] tracking-widest italic opacity-30">Katalog produk masih kosong</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={form.id ? "Edit Data Produk" : "Daftarkan Produk Baru"}
        size="lg"
        footer={<button onClick={handleSave} disabled={isProcessing} className="px-10 py-4 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl flex items-center gap-2">{isProcessing && <Loader2 className="animate-spin" size={14} />} Simpan Produk</button>}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pb-4">
           <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nama Produk / Jasa*</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:bg-white focus:border-emerald-500 transition-all shadow-sm shadow-inner" placeholder="Misal: Laptop ASUS..." />
           </div>

           <div className="space-y-2">
              <div className="flex items-center justify-between">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Kategori Produk</label>
                 <button type="button" onClick={() => setIsAddingCat(!isAddingCat)} className="text-[9px] font-bold text-emerald-600 uppercase hover:underline">
                    {isAddingCat ? 'Batal' : '+ Baru'}
                 </button>
              </div>
              {isAddingCat ? (
                <div className="flex gap-2">
                   <input autoFocus type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="flex-1 px-4 py-2.5 bg-gray-50 border border-emerald-100 rounded-lg font-bold text-[11px]" />
                   <button onClick={handleQuickAddCategory} className="px-3 bg-emerald-600 text-white rounded-lg"><Check size={14} /></button>
                </div>
              ) : (
                <div className="relative">
                   <Tags className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                   <select value={form.category_id || ''} onChange={e => setForm({...form, category_id: Number(e.target.value)})} className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none cursor-pointer">
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                </div>
              )}
           </div>

           <div className="space-y-2">
              <div className="flex items-center justify-between">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Satuan Produk</label>
                 <button type="button" onClick={() => setIsAddingUnit(!isAddingUnit)} className="text-[9px] font-bold text-emerald-600 uppercase hover:underline">
                    {isAddingUnit ? 'Batal' : '+ Baru'}
                 </button>
              </div>
              {isAddingUnit ? (
                <div className="flex gap-2">
                   <input autoFocus type="text" value={newUnitName} onChange={e => setNewUnitName(e.target.value)} className="flex-1 px-4 py-2.5 bg-gray-50 border border-emerald-100 rounded-lg font-bold text-[11px]" />
                   <button onClick={handleQuickAddUnit} className="px-3 bg-emerald-600 text-white rounded-xl"><Check size={14} /></button>
                </div>
              ) : (
                <div className="relative">
                   <Weight className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                   <select value={form.unit_id || ''} onChange={e => setForm({...form, unit_id: Number(e.target.value)})} className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none cursor-pointer">
                      {units.map(u => <option key={u.id} value={u.id}>{u.name.toUpperCase()}</option>)}
                   </select>
                </div>
              )}
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Harga Jual (IDR)</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-emerald-600">Rp</div>
                <input type="number" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-emerald-500 transition-all shadow-sm" placeholder="0" />
              </div>
           </div>

           <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Deskripsi & Catatan</label>
              <div className="relative">
                <FileText className="absolute left-4 top-4 text-gray-300" size={16} />
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl h-24 outline-none resize-none focus:bg-white focus:border-emerald-500 shadow-sm transition-all" placeholder="Tambahkan spesifikasi atau detail produk di sini..." />
              </div>
           </div>
        </div>
      </Modal>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
};
