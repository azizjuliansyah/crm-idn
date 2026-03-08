'use client';

import React, { useState, useEffect, useCallback } from 'react';

import { Input, Button, Table, TableHeader, TableBody, TableRow, TableCell, H2, Subtext, Label, Modal, EmptyState, Toast, ToastType } from '@/components/ui';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { ActionButton } from '@/components/shared/buttons/ActionButton';


import { supabase } from '@/lib/supabase';
import { Company, TicketTopic } from '@/lib/types';
import {
  Plus, Edit2, Trash2, Loader2, Ticket, Save
} from 'lucide-react';

interface Props {
  company: Company;
}

export const TicketTopicSettingsView: React.FC<Props> = ({ company }) => {
  const [topics, setTopics] = useState<TicketTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [form, setForm] = useState<Partial<TicketTopic>>({ name: '', description: '' });

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
    if (isInitial) setLoading(true);
    try {
      const { data } = await supabase
        .from('ticket_topics')
        .select('*')
        .eq('company_id', company.id)
        .order('id');
      if (data) setTopics(data);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [company.id]);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    setIsProcessing(true);
    try {
      if (form.id) {
        await supabase.from('ticket_topics').update({
          name: form.name,
          description: form.description
        }).eq('id', form.id);
      } else {
        await supabase.from('ticket_topics').insert({
          name: form.name,
          description: form.description,
          company_id: company.id
        });
      }
      setIsModalOpen(false);
      fetchData();
      showToast('Topik tiket berhasil disimpan.');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteClick = (topic: TicketTopic) => {
    setConfirmDelete({ isOpen: true, id: topic.id, name: topic.name });
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('ticket_topics').delete().eq('id', confirmDelete.id);
      if (error) throw error;
      setConfirmDelete({ isOpen: false, id: null, name: '' });
      fetchData();
      showToast('Topik tiket berhasil dihapus.');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-indigo-600 mb-4" /><Subtext className="text-[10px]  uppercase  text-gray-400">Memuat Daftar Topik...</Subtext></div>;

  return (
    <div className="max-w-4xl flex flex-col space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div>
          <H2 className="text-xl ">Topik Tiket</H2>
          <Subtext className="text-[10px] uppercase font-semibold text-gray-400">Kelola kategori topik bantuan untuk mempermudah klasifikasi tiket support.</Subtext>
        </div>
        <Button
          onClick={() => { setForm({ name: '' }); setIsModalOpen(true); }}
          leftIcon={<Plus size={14} strokeWidth={3} />}
          variant='primary'
          size='sm'
        >
          Topik Baru
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="">Nama Topik</TableCell>
              <TableCell isHeader className="">Deskripsi</TableCell>
              <TableCell isHeader className=" text-center w-32">Aksi</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topics.map(item => (
              <TableRow key={item.id}>
                <TableCell className="px-10 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                      <Ticket size={16} />
                    </div>
                    <Label className="text-sm  text-gray-900 ">{item.name}</Label>
                  </div>
                </TableCell>
                <TableCell className="px-10 py-6 text-sm text-gray-600">
                  {item.description || <Label className="text-gray-300 italic">Tidak ada deskripsi</Label>}
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
            {topics.length === 0 && (
              <TableRow><TableCell colSpan={3} className="py-20 text-center text-gray-300  uppercase text-[10px]  italic opacity-30">Daftar topik kosong</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={form.id ? "Edit Topik" : "Tambah Topik Baru"}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isProcessing} className="rounded-md">
              Batal
            </Button>
            <Button
              onClick={handleSave}
              isLoading={isProcessing}
              variant='primary'
              className="rounded-md"
            >
              Simpan Topik
            </Button>
          </div>
        }
      >
        <div className="space-y-6 py-2">
          <div className="space-y-2">
            <Label className="ml-1">Nama Topik</Label>
            <Input
              type="text"
              value={form.name || ''}
              onChange={(e: any) => setForm({ ...form, name: e.target.value })}
              className="!py-4"
              placeholder="Misal: Billing, Teknis, Layanan..."
            />
          </div>
          <div className="space-y-2">
            <Label className="ml-1">Deskripsi Ringkas</Label>
            <Input
              type="text"
              value={form.description || ''}
              onChange={(e: any) => setForm({ ...form, description: e.target.value })}
              className="!py-4"
              placeholder="Keterangan untuk topik ini (opsional)"
            />
          </div>
        </div>
      </Modal>
      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
        onConfirm={executeDelete}
        title="Hapus Topik Tiket"
        itemName={confirmDelete.name}
        description="Semua tiket terkait mungkin akan kehilangan referensi topiknya."
        isProcessing={isProcessing}
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
