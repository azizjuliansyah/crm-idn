'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, ProductCategory } from '@/lib/types';
import { 
  Plus, Edit2, Trash2, Loader2, Tags, AlertTriangle, X, CheckCircle2
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { Table, TableHeader, TableBody, TableRow, TableCell, Input, Button, Card, EmptyState, H3, Subtext } from '@/components/ui';

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
    <div className="max-w-2xl space-y-8 text-gray-900">
      <Card className="p-10 border-b border-gray-50 flex items-center justify-between !rounded-b-none">
          <div>
             <H3 className="!tracking-tighter !normal-case text-2xl">Kategori Produk</H3>
             <Subtext className="mt-1">Klasifikasikan produk dan jasa Anda.</Subtext>
          </div>
          <Button 
            onClick={() => { setForm({ name: '' }); setIsModalOpen(true); }}
            leftIcon={<Plus size={16} />}
          >
            Kategori Baru
          </Button>
      </Card>

      <Card className="!rounded-t-none !border-t-0 p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell className="font-bold text-gray-400 uppercase tracking-widest text-[10px]">Nama Kategori</TableCell>
                <TableCell className="font-bold text-gray-400 uppercase tracking-widest text-[10px] text-center">Aksi</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                        <Tags size={16} />
                      </div>
                      <span className="text-sm font-bold text-gray-900 tracking-tight">{item.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={() => { setForm(item); setIsModalOpen(true); }} className="!p-2 text-blue-500 hover:bg-blue-50">
                        <Edit2 size={16} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(item)} className="!p-2 text-rose-500 hover:bg-rose-50">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {categories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2}>
                    <EmptyState 
                      icon={<Tags size={48} className="mx-auto mb-4" />}
                      title="Tidak ada kategori terdaftar"
                      description="Belum ada data kategori produk yang tercatat"
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
        title={form.id ? "Edit Kategori" : "Tambah Kategori Baru"}
        size="md"
        footer={
          <Button 
            onClick={handleSave} 
            isLoading={isProcessing} 
            disabled={isProcessing} 
            className="px-10 py-4 shadow-xl flex items-center gap-2"
          >
            Simpan Kategori
          </Button>
        }
      >
        <div className="space-y-4 pb-2 text-left">
           <Input 
             label="Nama Kategori"
             value={form.name} 
             onChange={e => setForm({...form, name: e.target.value})} 
             placeholder="Misal: Perangkat Keras, Langganan Bulanan..." 
             className="!py-3"
           />
        </div>
      </Modal>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal 
        isOpen={confirmDelete.isOpen} 
        onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })} 
        onConfirm={executeDelete}
        title="Hapus Kategori"
        itemName={confirmDelete.name}
        description={`Tindakan ini permanen. Pastikan tidak ada produk yang terhubung dengan kategori ${confirmDelete.name}.`}
      />

      {/* NOTIFICATION MODAL */}
      <Modal isOpen={notification.isOpen} onClose={() => setNotification({ ...notification, isOpen: false })} title="" size="sm">
        <div className="flex flex-col items-center py-6 text-center">
           <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{notification.type === 'success' ? <CheckCircle2 size={32} /> : <X size={32} />}</div>
           <H3 className="mb-2 !normal-case">{notification.title}</H3>
           <Subtext className="mb-8">{notification.message}</Subtext>
           <Button onClick={() => setNotification({ ...notification, isOpen: false })} className="w-full uppercase tracking-widest">Tutup</Button>
        </div>
      </Modal>
    </div>
  );
};
