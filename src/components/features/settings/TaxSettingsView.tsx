'use client';

import React, { useState, useEffect, useCallback } from 'react';

import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { Input, Button, Table, TableHeader, TableBody, TableRow, TableCell, H2, Subtext, Label, Modal, Toast, ToastType, Toggle } from '@/components/ui';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';


import { supabase } from '@/lib/supabase';
import { Company, TaxSetting } from '@/lib/types';
import {
  Plus, Edit2, Trash2, Loader2, Coins, CheckCircle2
} from 'lucide-react';

interface Props {
  company: Company;
}

export const TaxSettingsView: React.FC<Props> = ({ company }) => {
  const [taxes, setTaxes] = useState<TaxSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [form, setForm] = useState<Partial<TaxSetting>>({ name: '', rate: 0, is_active: true, is_default: false });

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
        .from('tax_settings')
        .select('*')
        .eq('company_id', company.id)
        .order('id');
      if (data) setTaxes(data);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [company.id]);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || form.rate === undefined) return;
    setIsProcessing(true);
    try {
      if (form.is_default) {
        // Reset default lain jika item ini diset sebagai default
        await supabase.from('tax_settings').update({ is_default: false }).eq('company_id', company.id);
      }

      if (form.id) {
        await supabase.from('tax_settings').update({
          name: form.name,
          rate: form.rate,
          is_active: form.is_active,
          is_default: form.is_default
        }).eq('id', form.id);
      } else {
        await supabase.from('tax_settings').insert({
          ...form,
          company_id: company.id
        });
      }
      setIsModalOpen(false);
      fetchData();
      showToast('Pengaturan pajak berhasil disimpan.');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleActive = async (tax: TaxSetting) => {
    try {
      await supabase.from('tax_settings').update({ is_active: !tax.is_active }).eq('id', tax.id);
      fetchData();
      showToast(`Status pajak ${tax.name} berhasil diubah.`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = (tax: TaxSetting) => {
    setConfirmDelete({ isOpen: true, id: tax.id, name: tax.name });
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('tax_settings').delete().eq('id', confirmDelete.id);
      if (error) throw error;
      setConfirmDelete({ isOpen: false, id: null, name: '' });
      fetchData();
      showToast('Pengaturan pajak berhasil dihapus.');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-indigo-600 mb-4" /><Subtext className="text-[10px]  uppercase  text-gray-400">Memuat Daftar Pajak...</Subtext></div>;

  return (
    <div className="max-w-4xl flex flex-col space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div>
          <H2 className="text-xl ">Pengaturan Pajak</H2>
          <Subtext className="text-[10px] uppercase font-semibold text-gray-400">Kelola daftar tarif pajak yang berlaku untuk penawaran dan invoice.</Subtext>
        </div>
        <Button
          onClick={() => { setForm({ name: '', rate: 0, is_active: true, is_default: false }); setIsModalOpen(true); }}
          leftIcon={<Plus size={14} strokeWidth={3} />}
          className="!px-6 py-2.5 text-[10px] uppercase shadow-lg shadow-indigo-100"
          variant="primary"
          size="sm"
        >
          Tambah Pajak
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="">Nama Pajak</TableCell>
              <TableCell isHeader className=" text-center">Tarif (%)</TableCell>
              <TableCell isHeader className=" text-center">Default</TableCell>
              <TableCell isHeader className=" text-center">Status</TableCell>
              <TableCell isHeader className=" text-center">Aksi</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {taxes.map(item => (
              <TableRow key={item.id}>
                <TableCell className="px-10 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                      <Coins size={16} />
                    </div>
                    <Label className="text-sm  text-gray-900 ">{item.name}</Label>
                  </div>
                </TableCell>
                <TableCell className={`px-10 py-6 text-center  text-sm ${item.rate < 0 ? 'text-rose-600' : 'text-gray-700'}`}>
                  {item.rate}%
                </TableCell>
                <TableCell className="px-10 py-6 text-center">
                  {item.is_default ? (
                    <CheckCircle2 size={18} className="text-emerald-500 mx-auto" />
                  ) : (
                    <Label className="text-[10px]  text-gray-200">-</Label>
                  )}
                </TableCell>
                <TableCell className="px-10 py-6 text-center">
                  <Toggle
                    checked={item.is_active}
                    onChange={() => handleToggleActive(item)}
                    variant="indigo"
                  />
                </TableCell>
                <TableCell className="px-10 py-6 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <ActionButton
                      icon={Edit2}
                      variant="blue"
                      onClick={() => { setForm(item); setIsModalOpen(true); }}
                    />
                    <ActionButton
                      icon={Trash2}
                      variant="rose"
                      onClick={() => handleDelete(item)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {taxes.length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-20 text-center text-gray-300  uppercase text-[10px]  italic opacity-30">Daftar pajak kosong</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={form.id ? "Edit Pajak" : "Tambah Pajak Baru"}
        size="md"
        footer={
          <Button
            onClick={handleSave}
            isLoading={isProcessing}
            className="w-full !py-4 shadow-xl"
          >
            Simpan Pajak
          </Button>
        }
      >
        <div className="space-y-6 py-2">
          <div className="space-y-2">
            <Label className="ml-1">Nama / Deskripsi Pajak</Label>
            <Input
              type="text"
              value={form.name || ''}
              onChange={(e: any) => setForm({ ...form, name: e.target.value })}
              className="!py-4"
              placeholder="Misal: PPN 11%, PPh 23..."
            />
          </div>
          <div className="space-y-2">
            <Label className="ml-1">Persentase Tarif (%)</Label>
            <div className="relative group">
              <Input
                type="text"
                value={form.rate?.toString() || '0'}
                onChange={(e: any) => {
                  const val = e.target.value;
                  // Izinkan angka, titik desimal, dan tanda minus di awal
                  if (val === '' || val === '-' || /^-?\d*\.?\d*$/.test(val)) {
                    setForm({ ...form, rate: val === '-' ? -0 : (val === '' ? 0 : Number(val)) });
                  }
                }}
                className="!py-4"
                placeholder="Gunakan '-' untuk nilai negatif"
              />
              <Label className="absolute right-5 top-1/2 -translate-y-1/2  text-gray-300">%</Label>
            </div>
            <Subtext className="text-[9px] text-gray-400 italic px-1">Ketikan tanda minus ( - ) di awal angka jika ini adalah potongan / deduksi pajak.</Subtext>
          </div>

          <div className="flex flex-col gap-4 pt-2">
            <Label className="flex items-center gap-3 cursor-pointer group">
              <Input
                type="checkbox"
                checked={form.is_active}
                onChange={(e: any) => setForm({ ...form, is_active: e.target.checked })}
                className="!w-5 !h-5 !rounded-md"
              />
              <Label className="text-xs  text-gray-600 group-hover:text-indigo-600 transition-colors">Aktifkan Pajak Ini</Label>
            </Label>
            <Label className="flex items-center gap-3 cursor-pointer group">
              <Input
                type="checkbox"
                checked={form.is_default}
                onChange={(e: any) => setForm({ ...form, is_default: e.target.checked })}
                className="!w-5 !h-5 !rounded-md"
              />
              <Label className="text-xs  text-gray-600 group-hover:text-indigo-600 transition-colors">Jadikan Pilihan Default</Label>
            </Label>
          </div>
        </div>
      </Modal>
      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
        onConfirm={executeDelete}
        title="Hapus Pengaturan Pajak"
        itemName={confirmDelete.name}
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
