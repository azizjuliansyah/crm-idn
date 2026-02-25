'use client';

import { Loader2, Plus, Edit2, Trash2, X, Weight, CheckCircle as CheckCircle2 } from 'lucide-react';

import { Company, ProductUnit } from '@/lib/types';

import { supabase } from '@/lib/supabase';

import React, { useState, useEffect, useCallback } from 'react';

import { Input, Button, Table, TableHeader, TableBody, TableRow, TableCell, H3, Subtext, Label, Modal, Card, EmptyState } from '@/components/ui';


import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';

interface Props {
  company: Company | null;
}

export const ProductUnitsView: React.FC<Props> = ({ company }) => {
  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [form, setForm] = useState<Partial<ProductUnit>>({ name: '' });

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
        .from('product_units')
        .select('*')
        .eq('company_id', company.id)
        .order('name');
      if (data) setUnits(data);
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
        await supabase.from('product_units').update({ name: form.name.trim() }).eq('id', form.id);
      } else {
        await supabase.from('product_units').insert({ name: form.name.trim(), company_id: company.id });
      }
      setIsModalOpen(false);
      fetchData();
      setNotification({ isOpen: true, title: 'Berhasil', message: 'Satuan produk telah disimpan.', type: 'success' });
    } catch (err: any) {
      setNotification({ isOpen: true, title: 'Gagal', message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteClick = (unit: ProductUnit) => {
    setConfirmDelete({ isOpen: true, id: unit.id, name: unit.name });
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('product_units').delete().eq('id', confirmDelete.id);
      if (error) throw error;
      setConfirmDelete({ isOpen: false, id: null, name: '' });
      fetchData();
    } catch (err: any) {
      setNotification({ isOpen: true, title: 'Gagal Menghapus', message: 'Data tidak dapat dihapus karena masih digunakan oleh produk lain.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-emerald-600 mb-4" /><Subtext className="text-[10px]  uppercase tracking-tight text-gray-400">Memuat Satuan...</Subtext></div>;
  if (!company) return <div className="text-center p-8 text-gray-500">Pilih workspace terlebih dahulu</div>;

  return (
    <div className="max-w-2xl space-y-8 text-gray-900">
      <Card>
        <div className="p-10 border-b border-gray-50 flex items-center justify-between">
          <div>
            <H3 className="!tracking-tight !normal-case text-2xl">Satuan Produk</H3>
            <Subtext className="mt-1">Kelola standar pengukuran produk Anda.</Subtext>
          </div>
          <Button
            onClick={() => { setForm({ name: '' }); setIsModalOpen(true); }}
            leftIcon={<Plus size={16} />}
            variant="success"
          >
            Satuan Baru
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader>Nama Satuan</TableCell>
                <TableCell isHeader className="text-center">Aksi</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                        <Weight size={16} />
                      </div>
                      <Label className="text-sm text-gray-900 uppercase tracking-tight">{item.name}</Label>
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
              {units.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2}>
                    <EmptyState
                      icon={<Weight size={48} className="mx-auto mb-4" />}
                      title="Tidak ada satuan terdaftar"
                      description="Belum ada data satuan produk yang tercatat"
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
        title={form.id ? "Edit Satuan" : "Tambah Satuan Baru"}
        size="md"
        footer={
          <Button
            onClick={handleSave}
            isLoading={isProcessing}
            disabled={isProcessing}
            variant="success"
            className="px-10 py-4 shadow-xl flex items-center gap-2"
          >
            Simpan Satuan
          </Button>
        }
      >
        <div className="space-y-4 pb-2 text-left">
          <Input
            label="Nama Satuan"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Misal: BOX, RIM, PACK..."
            className="!py-3 uppercase placeholder:normal-case"
          />
        </div>
      </Modal>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
        onConfirm={executeDelete}
        title="Hapus Satuan"
        itemName={confirmDelete.name}
        description={`Tindakan ini permanen. Pastikan tidak ada produk yang menggunakan satuan ${confirmDelete.name}.`}
      />

      {/* NOTIFICATION MODAL */}
      <Modal isOpen={notification.isOpen} onClose={() => setNotification({ ...notification, isOpen: false })} title="" size="sm">
        <div className="flex flex-col items-center py-6 text-center">
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{notification.type === 'success' ? <CheckCircle2 size={32} /> : <X size={32} />}</div>
          <H3 className="mb-2 !normal-case">{notification.title}</H3>
          <Subtext className="mb-8">{notification.message}</Subtext>
          <Button onClick={() => setNotification({ ...notification, isOpen: false })} className="w-full uppercase tracking-tight">Tutup</Button>
        </div>
      </Modal>
    </div>
  );
};
