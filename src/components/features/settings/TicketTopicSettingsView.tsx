'use client';

import React, { useState, useEffect, useCallback } from 'react';

import { Input, Button, Table, TableHeader, TableBody, TableRow, TableCell, H3, Subtext, Label, Modal } from '@/components/ui';


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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('ticket_topics')
        .select('*')
        .eq('company_id', company.id)
        .order('id');
      if (data) setTopics(data);
    } finally {
      setLoading(false);
    }
  }, [company.id]);

  useEffect(() => {
    fetchData();
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
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus topik tiket ini? Semua tiket terkait mungkin akan kehilangan topiknya.")) return;
    await supabase.from('ticket_topics').delete().eq('id', id);
    fetchData();
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-indigo-600 mb-4" /><Subtext className="text-[10px]  uppercase tracking-tight text-gray-400">Memuat Daftar Topik...</Subtext></div>;

  return (
    <div className="max-w-4xl space-y-8">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-10 border-b border-gray-50 flex items-center justify-between">
          <div>
            <H3 className="text-2xl  text-gray-900 tracking-tight">Topik Tiket (Ticket Topic)</H3>
            <Subtext className="text-sm text-gray-400 font-medium mt-1">Daftar kategori / topik untuk mengklasifikasikan Support Ticket & Complaint.</Subtext>
          </div>
          <Button
            onClick={() => { setForm({ name: '', description: '' }); setIsModalOpen(true); }}
            leftIcon={<Plus size={16} />}
            variant='primary'
          >
            Tambah Topik
          </Button>
        </div>

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
                    <Label className="text-sm  text-gray-900 tracking-tight">{item.name}</Label>
                  </div>
                </TableCell>
                <TableCell className="px-10 py-6 text-sm text-gray-600">
                  {item.description || <Label className="text-gray-300 italic">Tidak ada deskripsi</Label>}
                </TableCell>
                <TableCell className="px-10 py-6 text-center">
                  <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={() => { setForm(item); setIsModalOpen(true); }} className="!p-2 text-blue-500 hover:bg-blue-50">
                      <Edit2 size={16} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="!p-2 text-rose-500 hover:bg-rose-50">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {topics.length === 0 && (
              <TableRow><TableCell colSpan={3} className="py-20 text-center text-gray-300  uppercase text-[10px] tracking-tight italic opacity-30">Daftar topik kosong</TableCell></TableRow>
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
          <Button
            onClick={handleSave}
            isLoading={isProcessing}
            className="w-full !py-4 shadow-xl bg-indigo-600 hover:bg-indigo-700"
          >
            Simpan Topik
          </Button>
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
    </div>
  );
};
