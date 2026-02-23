'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, Product, ProductCategory, ProductUnit } from '@/lib/types';
import { 
  Plus, Search, Edit2, Trash2, Loader2, Package, 
  Tags, Weight, FileText, Check, X, CheckCircle2
} from 'lucide-react';
import { Modal, SearchInput, Button, Input, Select, Textarea, Table, TableHeader, TableBody, TableRow, TableCell, Card, EmptyState, Label } from '@/components/ui';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';

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
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });

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

  const handleDeleteClick = (id: number) => {
    setConfirmDelete({ isOpen: true, id });
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    try {
      await supabase.from('products').delete().eq('id', confirmDelete.id);
      fetchData();
    } finally {
      setConfirmDelete({ isOpen: false, id: null });
    }
  };

  const formatIDR = (num: number = 0) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num).replace('Rp', 'Rp ');
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-emerald-600 mb-4" /><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sinkronisasi Katalog Produk...</p></div>;
  if (!company) return <div className="text-center p-8 text-gray-500">Pilih workspace terlebih dahulu</div>;

  return (
    <div className="space-y-6 h-full flex flex-col text-gray-900">
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0 overflow-x-auto custom-scrollbar">
        <div className="w-[400px] shrink-0">
          <SearchInput 
            placeholder="Cari nama produk atau kategori..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="rounded-xl border-gray-100 shadow-none bg-gray-50/30"
          />
        </div>
        <Button 
          onClick={() => { setForm({ name: '', category_id: categories[0]?.id || null, unit_id: units[0]?.id || null, price: 0, description: '' }); setIsModalOpen(true); }}
          variant="success"
          className="!px-6 py-2.5 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 shrink-0"
        >
          <div className="flex items-center gap-2">
            <Plus size={14} strokeWidth={3} />
            <span>Produk Baru</span>
          </div>
        </Button>
      </div>

      <Card className="!p-0 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto h-full custom-scrollbar">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md border-b border-gray-100">
              <TableRow className="hover:bg-transparent">
                <TableCell className="font-black text-gray-400 uppercase tracking-widest text-[10px] py-4 px-6">Informasi Produk</TableCell>
                <TableCell className="font-black text-gray-400 uppercase tracking-widest text-[10px] py-4 px-6">Kategori</TableCell>
                <TableCell className="font-black text-gray-400 uppercase tracking-widest text-[10px] py-4 px-6">Satuan</TableCell>
                <TableCell className="font-black text-gray-400 uppercase tracking-widest text-[10px] text-right py-4 px-6">Harga Jual</TableCell>
                <TableCell className="font-black text-gray-400 uppercase tracking-widest text-center text-[10px] py-4 px-6">Aksi</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map(item => (
                <TableRow key={item.id} className="group hover:bg-emerald-50/30 transition-colors border-b border-gray-50/50 last:border-0">
                  <TableCell className="py-5 px-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm border border-emerald-100"><Package size={20} strokeWidth={2.5} /></div>
                      <div>
                        <p className="text-sm font-black text-gray-900 tracking-tight">{item.name}</p>
                        {item.description && <p className="text-[10px] text-gray-400 font-bold mt-0.5 line-clamp-1 italic">{item.description}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-5 px-6">
                    <span className="px-3 py-1 bg-white border border-gray-100 rounded-full text-[9px] font-black uppercase tracking-widest text-gray-500 shadow-sm">
                      {item.product_categories?.name || 'Umum'}
                    </span>
                  </TableCell>
                  <TableCell className="py-5 px-6">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.product_units?.name || '-'}</span>
                  </TableCell>
                  <TableCell className="text-right font-black text-emerald-600 text-sm py-5 px-6 bg-emerald-50/5 group-hover:bg-emerald-50/20">{formatIDR(item.price)}</TableCell>
                  <TableCell className="text-center py-5 px-6">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0">
                      <Button variant="ghost" size="sm" onClick={() => { setForm(item); setIsModalOpen(true); }} className="!p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all" title="Edit">
                        <Edit2 size={16} strokeWidth={2.5} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(item.id)} className="!p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all" title="Hapus">
                        <Trash2 size={16} strokeWidth={2.5} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <EmptyState 
                      icon={<Package size={48} className="mx-auto mb-4" />}
                      title="Katalog produk masih kosong"
                      description="Belum ada data produk yang terdaftar"
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={form.id ? "Edit Data Produk" : "Daftarkan Produk Baru"}
        size="lg"
        footer={
          <Button 
            onClick={handleSave} 
            isLoading={isProcessing} 
            disabled={isProcessing} 
            variant="success"
            className="px-10 py-4 shadow-xl flex items-center gap-2"
          >
            Simpan Produk
          </Button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pb-4">
           <div className="md:col-span-2 space-y-2 text-left">
              <Input 
                label="Nama Produk / Jasa*"
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})} 
                placeholder="Misal: Laptop ASUS..." 
                className="!py-3"
              />
           </div>

           <div className="space-y-2 text-left">
              <div className="flex items-center justify-between">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Kategori Produk</label>
                 <Button variant="ghost" size="sm" onClick={() => setIsAddingCat(!isAddingCat)} className="!text-[9px] !font-bold text-emerald-600 uppercase hover:underline !p-0 !h-auto">
                    {isAddingCat ? 'Batal' : '+ Baru'}
                 </Button>
              </div>
              {isAddingCat ? (
                <div className="flex gap-2">
                   <Input autoFocus value={newCatName} onChange={e => setNewCatName(e.target.value)} className="flex-1 !py-2.5 !text-[11px]" />
                   <Button onClick={handleQuickAddCategory} className="px-3" variant="success"><Check size={14} /></Button>
                </div>
              ) : (
                <div className="relative">
                   <Select 
                     value={form.category_id || ''} 
                     onChange={e => setForm({...form, category_id: Number(e.target.value)})} 
                     className="!py-3"
                   >
                      <option value="">Pilih Kategori</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </Select>
                </div>
              )}
           </div>

           <div className="space-y-2 text-left">
              <div className="flex items-center justify-between">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Satuan Produk</label>
                 <Button variant="ghost" size="sm" onClick={() => setIsAddingUnit(!isAddingUnit)} className="!text-[9px] !font-bold text-emerald-600 uppercase hover:underline !p-0 !h-auto">
                    {isAddingUnit ? 'Batal' : '+ Baru'}
                 </Button>
              </div>
              {isAddingUnit ? (
                <div className="flex gap-2">
                   <Input autoFocus value={newUnitName} onChange={e => setNewUnitName(e.target.value)} className="flex-1 !py-2.5 !text-[11px]" />
                   <Button onClick={handleQuickAddUnit} className="px-3" variant="success"><Check size={14} /></Button>
                </div>
              ) : (
                <div className="relative">
                   <Select 
                     value={form.unit_id || ''} 
                     onChange={e => setForm({...form, unit_id: Number(e.target.value)})} 
                     className="!py-3"
                   >
                      <option value="">Pilih Satuan</option>
                      {units.map(u => <option key={u.id} value={u.id}>{u.name.toUpperCase()}</option>)}
                   </Select>
                </div>
              )}
           </div>

           <div className="space-y-2 text-left">
              <Input 
                label="Harga Jual (IDR)"
                type="number" 
                value={form.price} 
                onChange={e => setForm({...form, price: Number(e.target.value)})} 
                leftIcon={<span className="text-[11px] font-bold text-emerald-600">Rp</span>}
                placeholder="0" 
                className="!py-3"
              />
           </div>

           <div className="md:col-span-2 space-y-2 text-left">
              <Textarea 
                label="Deskripsi & Catatan"
                value={form.description} 
                onChange={e => setForm({...form, description: e.target.value})} 
                className="h-24 resize-none" 
                placeholder="Tambahkan spesifikasi atau detail produk di sini..." 
              />
           </div>
        </div>
      </Modal>

      <ConfirmDeleteModal 
        isOpen={confirmDelete.isOpen} 
        onClose={() => setConfirmDelete({ isOpen: false, id: null })} 
        onConfirm={executeDelete}
        title="Hapus Produk" 
        itemName="Produk ini"
        description="Apakah Anda yakin ingin menghapus produk ini dari katalog?"
      />

      <style jsx global>{`
      `}</style>
    </div>
  );
};
