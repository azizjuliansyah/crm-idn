'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { Input, Textarea, Button, Table, TableHeader, TableBody, TableRow, TableCell, Subtext, Label, Modal, Card, EmptyState, SearchInput, ComboBox, H2, Toast, ToastType, Badge, InfiniteScrollSentinel } from '@/components/ui';


import { supabase } from '@/lib/supabase';
import { Company, Product, ProductCategory, ProductUnit } from '@/lib/types';
import {
  Plus, Search, Edit2, Trash2, Loader2, Package,
  Tags, Weight, FileText, Check, X, CheckCircle2
} from 'lucide-react';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { useSearchParams } from 'next/navigation';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';

interface Props {
  company: Company | null;
}

export const ProductsView: React.FC<Props> = ({ company }) => {
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
    isOpen: false,
    message: '',
    type: 'success',
  });

  // Quick Add State
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');

  const [form, setForm] = useState<Partial<Product>>({
    name: '', category_id: null, unit_id: null, price: 0, description: ''
  });

  const fetchProducts = useCallback(async ({ from, to }: { from: number, to: number }) => {
    if (!company?.id) return { data: [], error: null, count: 0 };
    
    let query = supabase
      .from('products')
      .select('*, product_categories(*), product_units(*)', { count: 'exact' })
      .eq('company_id', company.id);

    if (searchTerm) {
      query = query.ilike('name', `%${searchTerm}%`);
    }

    const { data, error, count } = await query
      .order('name')
      .range(from, to);

    return { data: data || [], error, count };
  }, [company?.id, searchTerm]);

  const {
    data: products,
    isLoading: productsLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    refresh
  } = useInfiniteScroll<Product>(fetchProducts, {
    pageSize: 20,
    dependencies: [company?.id, searchTerm]
  });

  const fetchMetadata = useCallback(async () => {
    if (!company?.id) return;
    setLoadingMetadata(true);
    try {
      const [catRes, unitRes] = await Promise.all([
        supabase.from('product_categories').select('*').eq('company_id', company.id).order('name'),
        supabase.from('product_units').select('*').eq('company_id', company.id).order('name')
      ]);

      if (catRes.data) setCategories(catRes.data);
      if (unitRes.data) setUnits(unitRes.data);
    } finally {
      setLoadingMetadata(false);
    }
  }, [company?.id]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  useEffect(() => {
    const success = searchParams.get('success');
    if (success) {
      setToast({ isOpen: true, message: 'Data Berhasil Disimpan', type: 'success' });

      // Clean up the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
    }
  }, [searchParams]);

  const filteredProducts = useMemo(() => {
    return [...products];
  }, [products]);

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
    } catch (err: any) {
      setToast({ isOpen: true, message: err.message, type: 'error' });
    }
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
    } catch (err: any) {
      setToast({ isOpen: true, message: err.message, type: 'error' });
    }
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
      setToast({ isOpen: true, message: `Produk berhasil ${form.id ? 'diperbarui' : 'ditambahkan'}`, type: 'success' });
      refresh();
    } catch (err: any) {
      setToast({ isOpen: true, message: err.message, type: 'error' });
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
      setToast({ isOpen: true, message: 'Produk berhasil dihapus', type: 'success' });
      refresh();
    } catch (err: any) {
      setToast({ isOpen: true, message: err.message, type: 'error' });
    } finally {
      setConfirmDelete({ isOpen: false, id: null });
    }
  };

  const formatIDR = (num: number = 0) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num).replace('Rp', 'Rp ');
  };

  if (loadingMetadata || (productsLoading && products.length === 0)) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-emerald-600 mb-4" /><Subtext className="text-[10px]  uppercase  text-gray-400">Sinkronisasi Katalog Produk...</Subtext></div>;
  if (!company) return <div className="text-center p-8 text-gray-500">Pilih workspace terlebih dahulu</div>;

  return (
    <div className="flex flex-col gap-6 text-gray-900">
      <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <H2 className="text-xl">Katalog Produk</H2>
            <Subtext className="text-[10px] uppercase ">Kelola daftar produk dan jasa untuk penawaran.</Subtext>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => { setForm({ name: '', category_id: categories[0]?.id || null, unit_id: units[0]?.id || null, price: 0, description: '' }); setIsModalOpen(true); }}
              leftIcon={<Plus size={14} strokeWidth={3} />}
              className="!px-6 py-2.5 text-[10px] uppercase  shadow-lg shadow-emerald-100"
              variant="primary"
              size="sm"
            >
              Produk Baru
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-50">
          <div className="w-[400px] shrink-0">
            <SearchInput
              placeholder="Cari nama produk atau kategori..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Card className="!p-0 overflow-hidden h-[80vh] mb-4 flex flex-col">
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md border-b border-gray-100">
              <TableRow className="hover:bg-transparent">
                <TableCell isHeader className="w-20">ID</TableCell>
                <TableCell isHeader>Informasi Produk</TableCell>
                <TableCell isHeader>Kategori</TableCell>
                <TableCell isHeader>Satuan</TableCell>
                <TableCell isHeader className="text-right">Harga Jual</TableCell>
                <TableCell isHeader className="text-center">Aksi</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map(item => (
                <TableRow key={item.id} className="group hover:bg-emerald-50/30 transition-colors border-b border-gray-50/50 last:border-0">
                  <TableCell className="py-5 px-6">
                    #{item.id}
                  </TableCell>
                  <TableCell className="py-5 px-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm border border-emerald-100"><Package size={20} strokeWidth={2.5} /></div>
                      <div>
                        <Subtext className="text-sm text-gray-900 font-medium ">{item.name}</Subtext>
                        {item.description && <Subtext className="text-[10px] text-gray-400  uppercase  italic">{item.description}</Subtext>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-5 px-6">
                    <Label className="px-3 py-1 bg-white border border-gray-100 rounded-full text-[9px] uppercase  text-gray-500 shadow-sm">
                      {item.product_categories?.name || 'Umum'}
                    </Label>
                  </TableCell>
                  <TableCell className="py-5 px-6">
                    <Label className="text-[10px] text-gray-500 uppercase ">{item.product_units?.name || '-'}</Label>
                  </TableCell>
                  <TableCell className="text-right">{formatIDR(item.price)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <ActionButton
                        icon={Edit2}
                        variant="blue"
                        onClick={() => { setForm(item); setIsModalOpen(true); }}
                        title="Edit"
                      />
                      <ActionButton
                        icon={Trash2}
                        variant="rose"
                        onClick={() => handleDeleteClick(item.id)}
                        title="Hapus"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              <InfiniteScrollSentinel 
                onIntersect={loadMore}
                enabled={hasMore}
                isLoading={isLoadingMore}
                colSpan={6}
              />
              {filteredProducts.length === 0 && !productsLoading && (
                <TableRow>
                  <TableCell colSpan={6}>
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
        onClose={() => {
          setIsModalOpen(false);
          setIsAddingCat(false);
          setIsAddingUnit(false);
          setNewCatName('');
          setNewUnitName('');
        }}
        title={form.id ? "Edit Data Produk" : "Daftarkan Produk Baru"}
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="ghost" onClick={() => {
              setIsModalOpen(false);
              setIsAddingCat(false);
              setIsAddingUnit(false);
              setNewCatName('');
              setNewUnitName('');
            }} disabled={isProcessing} className="rounded-md">
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              isLoading={isProcessing}
              disabled={isProcessing}
              className="rounded-md"
            >
              Simpan Produk
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pb-4">
          <div className="md:col-span-2 space-y-2 text-left">
            <Input
              label="Nama Produk / Jasa*"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Misal: Training..."
              className="!py-3"
            />
          </div>

          <div className="space-y-2 text-left">
            <Label className="text-[10px] text-gray-400 uppercase  ml-1">Kategori Produk</Label>
            {isAddingCat ? (
              <div className="animate-in slide-in-from-left-2 duration-200">
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    className="flex-1"
                    placeholder="Nama kategori..."
                  />
                  <Button onClick={handleQuickAddCategory} className="!px-3" size="sm" variant="success">
                    <Check size={14} />
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setIsAddingCat(false)} className="!px-3 text-gray-400">
                    <X size={14} />
                  </Button>
                </div>
              </div>
            ) : (
              <ComboBox
                value={form.category_id || ''}
                onChange={(val: string | number) => setForm({ ...form, category_id: Number(val) })}
                options={categories.map(c => ({ value: c.id, label: c.name }))}
                onAddNew={() => setIsAddingCat(true)}
                addNewLabel="Tambah Kategori Baru"
                className="w-full"
              />
            )}
          </div>

          <div className="space-y-2 text-left">
            <Label className="text-[10px] text-gray-400 uppercase  ml-1">Satuan Produk</Label>
            {isAddingUnit ? (
              <div className="animate-in slide-in-from-left-2 duration-200">
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    value={newUnitName}
                    onChange={e => setNewUnitName(e.target.value)}
                    className="flex-1"
                    placeholder="Nama satuan..."
                  />
                  <Button onClick={handleQuickAddUnit} className="!px-3" size="sm" variant="success">
                    <Check size={14} />
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setIsAddingUnit(false)} className="!px-3 text-gray-400">
                    <X size={14} />
                  </Button>
                </div>
              </div>
            ) : (
              <ComboBox
                value={form.unit_id || ''}
                onChange={(val: string | number) => setForm({ ...form, unit_id: Number(val) })}
                options={units.map(u => ({ value: u.id, label: u.name.toUpperCase() }))}
                onAddNew={() => setIsAddingUnit(true)}
                addNewLabel="Tambah Satuan Baru"
                className="w-full"
              />
            )}
          </div>

          <div className="space-y-2 text-left">
            <Input
              label="Harga Jual (IDR)"
              type="number"
              value={form.price}
              onChange={e => setForm({ ...form, price: Number(e.target.value) })}
              leftIcon={<Label className="text-[11px]  text-emerald-600">Rp</Label>}
              placeholder="0"
              className="!py-3"
            />
          </div>

          <div className="md:col-span-2 space-y-2 text-left">
            <Textarea
              label="Deskripsi & Catatan"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
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
        variant="horizontal"
      />

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
      />

      <style jsx global>{`
      `}</style>
    </div>
  );
};
