'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, TaxSetting } from '@/lib/types';
import { 
  Plus, Edit2, Trash2, Loader2, Coins, Save, CheckCircle2, 
  X, ToggleLeft, ToggleRight
} from 'lucide-react';
import { Modal, Button, Table, TableHeader, TableBody, TableRow, TableCell, Input, Label } from '@/components/ui';

interface Props {
  company: Company;
}

export const TaxSettingsView: React.FC<Props> = ({ company }) => {
  const [taxes, setTaxes] = useState<TaxSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [form, setForm] = useState<Partial<TaxSetting>>({ name: '', rate: 0, is_active: true, is_default: false });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('tax_settings')
        .select('*')
        .eq('company_id', company.id)
        .order('id');
      if (data) setTaxes(data);
    } finally {
      setLoading(false);
    }
  }, [company.id]);

  useEffect(() => {
    fetchData();
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
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleActive = async (tax: TaxSetting) => {
    await supabase.from('tax_settings').update({ is_active: !tax.is_active }).eq('id', tax.id);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus pengaturan pajak ini?")) return;
    await supabase.from('tax_settings').delete().eq('id', id);
    fetchData();
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-indigo-600 mb-4" /><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Memuat Daftar Pajak...</p></div>;

  return (
    <div className="max-w-4xl space-y-8">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-10 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 tracking-tighter">Pengaturan Pajak</h3>
            <p className="text-sm text-gray-400 font-medium mt-1">Daftar tarif pajak yang berlaku untuk penawaran dan invoice.</p>
          </div>
          <Button 
            onClick={() => { setForm({ name: '', rate: 0, is_active: true, is_default: false }); setIsModalOpen(true); }}
            leftIcon={<Plus size={16} />}
            className="!py-3.5 shadow-xl"
          >
            Tambah Pajak
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="px-10 py-5 text-[10px]">Nama Pajak</TableCell>
              <TableCell isHeader className="px-10 py-5 text-[10px] text-center">Tarif (%)</TableCell>
              <TableCell isHeader className="px-10 py-5 text-[10px] text-center">Default</TableCell>
              <TableCell isHeader className="px-10 py-5 text-[10px] text-center">Status</TableCell>
              <TableCell isHeader className="px-10 py-5 text-[10px] text-center">Aksi</TableCell>
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
                    <span className="text-sm font-bold text-gray-900 tracking-tight">{item.name}</span>
                  </div>
                </TableCell>
                <TableCell className={`px-10 py-6 text-center font-bold text-sm ${item.rate < 0 ? 'text-rose-600' : 'text-gray-700'}`}>
                  {item.rate}%
                </TableCell>
                <TableCell className="px-10 py-6 text-center">
                  {item.is_default ? (
                      <CheckCircle2 size={18} className="text-emerald-500 mx-auto" />
                  ) : (
                      <span className="text-[10px] font-bold text-gray-200">-</span>
                  )}
                </TableCell>
                <TableCell className="px-10 py-6 text-center">
                  <Button 
                    variant="ghost"
                    onClick={() => handleToggleActive(item)}
                    className={`!p-0 ${item.is_active ? 'text-indigo-600' : 'text-gray-300'}`}
                  >
                    {item.is_active ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                  </Button>
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
            {taxes.length === 0 && (
              <tr><td colSpan={5} className="py-20 text-center text-gray-300 font-bold uppercase text-[10px] tracking-widest italic opacity-30">Daftar pajak kosong</td></tr>
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
                onChange={(e: any) => setForm({...form, name: e.target.value})} 
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
                            setForm({...form, rate: val === '-' ? -0 : (val === '' ? 0 : Number(val))});
                        }
                    }} 
                    className="!py-4" 
                    placeholder="Gunakan '-' untuk nilai negatif" 
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 font-bold text-gray-300">%</span>
              </div>
              <p className="text-[9px] text-gray-400 italic px-1">Ketikan tanda minus ( - ) di awal angka jika ini adalah potongan / deduksi pajak.</p>
           </div>
           
           <div className="flex flex-col gap-4 pt-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                 <Input 
                    type="checkbox" 
                    checked={form.is_active} 
                    onChange={(e: any) => setForm({...form, is_active: e.target.checked})}
                    className="!w-5 !h-5 !rounded-md"
                 />
                 <span className="text-xs font-bold text-gray-600 group-hover:text-indigo-600 transition-colors">Aktifkan Pajak Ini</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                 <Input 
                    type="checkbox" 
                    checked={form.is_default} 
                    onChange={(e: any) => setForm({...form, is_default: e.target.checked})}
                    className="!w-5 !h-5 !rounded-md"
                 />
                 <span className="text-xs font-bold text-gray-600 group-hover:text-indigo-600 transition-colors">Jadikan Pilihan Default</span>
              </label>
           </div>
        </div>
      </Modal>
    </div>
  );
};
