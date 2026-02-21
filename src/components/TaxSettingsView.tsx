'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, TaxSetting } from '@/lib/types';
import { 
  Plus, Edit2, Trash2, Loader2, Coins, Save, CheckCircle2, 
  X, ToggleLeft, ToggleRight
} from 'lucide-react';
import { Modal } from './Modal';

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
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-10 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 tracking-tighter">Pengaturan Pajak</h3>
            <p className="text-sm text-gray-400 font-medium mt-1">Daftar tarif pajak yang berlaku untuk penawaran dan invoice.</p>
          </div>
          <button 
            onClick={() => { setForm({ name: '', rate: 0, is_active: true, is_default: false }); setIsModalOpen(true); }}
            className="px-6 py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-indigo-700 transition-all active:scale-95"
          >
            <Plus size={16} /> Tambah Pajak
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-10 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nama Pajak</th>
                <th className="px-10 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Tarif (%)</th>
                <th className="px-10 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Default</th>
                <th className="px-10 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-10 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {taxes.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/30 group transition-colors">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                        <Coins size={16} />
                      </div>
                      <span className="text-sm font-bold text-gray-900 tracking-tight">{item.name}</span>
                    </div>
                  </td>
                  <td className={`px-10 py-6 text-center font-bold text-sm ${item.rate < 0 ? 'text-rose-600' : 'text-gray-700'}`}>
                    {item.rate}%
                  </td>
                  <td className="px-10 py-6 text-center">
                    {item.is_default ? (
                        <CheckCircle2 size={18} className="text-emerald-500 mx-auto" />
                    ) : (
                        <span className="text-[10px] font-bold text-gray-200">-</span>
                    )}
                  </td>
                  <td className="px-10 py-6 text-center">
                    <button 
                      onClick={() => handleToggleActive(item)}
                      className={`transition-colors ${item.is_active ? 'text-indigo-600' : 'text-gray-300'}`}
                    >
                      {item.is_active ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                    </button>
                  </td>
                  <td className="px-10 py-6 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setForm(item); setIsModalOpen(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {taxes.length === 0 && (
                <tr><td colSpan={5} className="py-20 text-center text-gray-300 font-bold uppercase text-[10px] tracking-widest italic opacity-30">Daftar pajak kosong</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={form.id ? "Edit Pajak" : "Tambah Pajak Baru"}
        size="md"
        footer={<button onClick={handleSave} disabled={isProcessing} className="px-10 py-4 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl flex items-center gap-2">{isProcessing && <Loader2 className="animate-spin" size={14} />} Simpan Pajak</button>}
      >
        <div className="space-y-6 py-2">
           <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nama / Deskripsi Pajak</label>
              <input 
                type="text" 
                value={form.name || ''} 
                onChange={e => setForm({...form, name: e.target.value})} 
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all" 
                placeholder="Misal: PPN 11%, PPh 23..." 
              />
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Persentase Tarif (%)</label>
              <div className="relative group">
                <input 
                    type="text" 
                    value={form.rate?.toString() || '0'} 
                    onChange={e => {
                        const val = e.target.value;
                        // Izinkan angka, titik desimal, dan tanda minus di awal
                        if (val === '' || val === '-' || /^-?\d*\.?\d*$/.test(val)) {
                            setForm({...form, rate: val === '-' ? -0 : (val === '' ? 0 : Number(val))});
                        }
                    }} 
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm outline-none focus:bg-white focus:border-indigo-500 transition-all" 
                    placeholder="Gunakan '-' untuk nilai negatif" 
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 font-bold text-gray-300">%</span>
              </div>
              <p className="text-[9px] text-gray-400 italic px-1">Ketikan tanda minus ( - ) di awal angka jika ini adalah potongan / deduksi pajak.</p>
           </div>
           
           <div className="flex flex-col gap-4 pt-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                 <input 
                    type="checkbox" 
                    checked={form.is_active} 
                    onChange={e => setForm({...form, is_active: e.target.checked})}
                    className="w-5 h-5 rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                 />
                 <span className="text-xs font-bold text-gray-600 group-hover:text-indigo-600 transition-colors">Aktifkan Pajak Ini</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                 <input 
                    type="checkbox" 
                    checked={form.is_default} 
                    onChange={e => setForm({...form, is_default: e.target.checked})}
                    className="w-5 h-5 rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                 />
                 <span className="text-xs font-bold text-gray-600 group-hover:text-indigo-600 transition-colors">Jadikan Pilihan Default</span>
              </label>
           </div>
        </div>
      </Modal>
    </div>
  );
};
