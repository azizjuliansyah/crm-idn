import React, { useState, useEffect, useCallback } from 'react';
import { Input, Button, Table, TableHeader, TableBody, TableRow, TableCell, TableEmpty, H2, Subtext, Label, Modal, Badge, Toast, ToastType } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { Company, LeadSource } from '@/lib/types';
import {
  Plus, Search, Edit2, Trash2, Loader2, Globe,
  Save, AlertTriangle, List, CheckCircle2, X, ArrowUp, ArrowDown
} from 'lucide-react';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
// Removed legacy NotificationModal import

interface Props {
  company: Company;
}

export const LeadSourcesSettingsView: React.FC<Props> = ({ company }) => {
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [usedSources, setUsedSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState<{ id: string, name: string }>({
    id: '',
    name: ''
  });

  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string | null; name: string }>({ isOpen: false, id: null, name: '' });
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
    isOpen: false,
    message: '',
    type: 'success',
  });

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const { data: sourcesRes } = await supabase
        .from('lead_sources')
        .select('*')
        .eq('company_id', company.id)
        .order('name');

      const { data: leadsRes } = await supabase
        .from('leads')
        .select('source')
        .eq('company_id', company.id);

      if (sourcesRes) setSources(sourcesRes);
      if (leadsRes) {
        const distinct = Array.from(new Set(leadsRes.map((l: any) => l.source))) as string[];
        setUsedSources(distinct);
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [company.id]);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  const filteredSources = sources.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form.name.trim()) return;
    setIsProcessing(true);
    try {
      if (form.id) {
        await supabase.from('lead_sources').update({ name: form.name.trim() }).eq('id', form.id);
      } else {
        await supabase.from('lead_sources').insert({ name: form.name.trim(), company_id: company.id });
      }
      setIsModalOpen(false);
      fetchData();
      setToast({ isOpen: true, message: 'Sumber leads telah diperbarui.', type: 'success' });
    } catch (err: any) {
      setToast({ isOpen: true, message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteClick = (source: LeadSource) => {
    const isInUse = usedSources.includes(source.name);
    if (isInUse) {
      setToast({ isOpen: true, message: 'Sumber ini sedang aktif digunakan dan tidak dapat dihapus.', type: 'error' });
      return;
    }
    setConfirmDelete({ isOpen: true, id: source.id, name: source.name });
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    setIsProcessing(true);
    try {
      await supabase.from('lead_sources').delete().eq('id', confirmDelete.id);
      setConfirmDelete({ isOpen: false, id: null, name: '' });
      fetchData();
      setToast({ isOpen: true, message: 'Sumber leads berhasil dihapus.', type: 'success' });
    } catch (err: any) {
      setToast({ isOpen: true, message: 'Gagal menghapus: ' + err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24">
      <Loader2 className="animate-spin text-blue-600 mb-4" />
      <Subtext className="text-[10px]  uppercase  text-gray-400">Memuat Sumber Leads...</Subtext>
    </div>
  );

  return (
    <div className="max-w-4xl flex flex-col space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border-2 border-gray-300 shadow-none shrink-0">
        <div>
          <H2 className="text-xl ">Sumber Lead</H2>
          <Subtext className="text-[10px] uppercase font-semibold text-gray-400">Atur channel atau asal datangnya calon pelanggan ke dalam sistem.</Subtext>
        </div>
        <Button
          onClick={() => { setForm({ id: '', name: '' }); setIsModalOpen(true); }}
          leftIcon={<Plus size={14} strokeWidth={3} />}
          className="!px-6 py-2.5 text-[10px] uppercase shadow-none"
          variant='primary'
          size='sm'
        >
          Tambah Sumber
        </Button>
      </div>

      <div className="bg-white rounded-2xl border-2 border-gray-300 shadow-none overflow-hidden">

        <div className="p-6 border-b border-gray-50">
          <Input
            placeholder="Cari sumber..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            leftIcon={<Search size={14} />}
            className="!py-2.5 max-w-xs"
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader>Nama Sumber</TableCell>
              <TableCell isHeader className="text-center">Status Penggunaan</TableCell>
              <TableCell isHeader className="text-center">Aksi</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSources.map(item => {
              const isInUse = usedSources.includes(item.name);
              return (
                <TableRow key={item.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                        <Globe size={16} />
                      </div>
                      <Label className="text-sm  text-gray-900 ">{item.name}</Label>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={isInUse ? 'success' : 'neutral'}>
                      {isInUse ? 'Aktif Digunakan' : 'Kosong'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <ActionButton
                        icon={Edit2}
                        variant="blue"
                        onClick={() => { setForm({ id: item.id, name: item.name }); setIsModalOpen(true); }}
                      />
                      <ActionButton
                        icon={Trash2}
                        variant="rose"
                        onClick={() => handleDeleteClick(item)}
                        disabled={isInUse}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          {filteredSources.length === 0 && (
            <TableEmpty colSpan={3} icon={<Globe size={48} />} message="Data sumber tidak ditemukan" />
          )}
        </Table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={form.id ? "Edit Sumber Lead" : "Tambah Sumber Baru"}
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
              Simpan Sumber
            </Button>
          </div>
        }
      >
        <div className="space-y-4 pb-2">
          <Input
            label="Nama Sumber Lead"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Misal: Instagram, Event Offline..."
          />
        </div>
      </Modal>

      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
        onConfirm={executeDelete}
        title="Hapus Sumber"
        itemName={confirmDelete.name}
        isProcessing={isProcessing}
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
