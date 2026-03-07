'use client';

import { Loader2, Plus, Tags, Edit2, Trash2, X, CheckCircle as CheckCircle2 } from 'lucide-react';

import { Company, ProductCategory } from '@/lib/types';

import { supabase } from '@/lib/supabase';

import React, { useState, useEffect, useCallback } from 'react';

import { Input, Button, Table, TableHeader, TableBody, TableRow, TableCell, H2, Subtext, Label, Modal, EmptyState, Toast, ToastType } from '@/components/ui';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { ActionButton } from '@/components/shared/buttons/ActionButton';

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
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
    isOpen: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  const fetchData = useCallback(async (isInitial = false) => {
    if (!company?.id) {
      setLoading(false);
      return;
    }
    if (isInitial) setLoading(true);
    try {
      const { data } = await supabase
        .from('product_categories')
        .select('*')
        .eq('company_id', company.id)
        .order('name');
      if (data) setCategories(data);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    fetchData(true);
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
      showToast('Kategori produk telah disimpan.');
    } catch (err: any) {
      showToast(err.message, 'error');
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
      showToast('Data tidak dapat dihapus karena masih digunakan oleh produk lain.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-blue-600 mb-4" /><Subtext className="text-[10px]  uppercase  text-gray-400">Memuat Kategori...</Subtext></div>;
  if (!company) return <div className="text-center p-8 text-gray-500">Pilih workspace terlebih dahulu</div>;

  return (
    <div className="max-w-4xl flex flex-col space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div>
          <H2 className="text-xl ">Kategori Produk</H2>
          <Subtext className="text-[10px] uppercase font-semibold text-gray-400">Klasifikasikan produk dan jasa Anda ke dalam kategori yang tepat.</Subtext>
        </div>
        <Button
          onClick={() => { setForm({ name: '' }); setIsModalOpen(true); }}
          leftIcon={<Plus size={14} strokeWidth={3} />}
          className="!px-6 py-2.5 text-[10px] uppercase shadow-lg shadow-blue-100"
          variant='primary'
          size='sm'
        >
          Kategori Baru
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader>Nama Kategori</TableCell>
                <TableCell isHeader className="text-center">Aksi</TableCell>
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
                      <Label className="text-sm text-gray-900 ">{item.name}</Label>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <ActionButton
                        icon={Edit2}
                        variant="blue"
                        onClick={() => { setForm(item); setIsModalOpen(true); }}
                      />
                      <ActionButton
                        icon={Trash2}
                        variant="rose"
                        onClick={() => handleDeleteClick(item)}
                      />
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
      </div>

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
            variant="primary"
          >
            Simpan Kategori
          </Button>
        }
      >
        <div className="space-y-4 pb-2 text-left">
          <Input
            label="Nama Kategori"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
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
        variant="horizontal"
      />

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
