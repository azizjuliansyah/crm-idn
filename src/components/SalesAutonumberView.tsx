'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, AutonumberSetting } from '@/lib/types';
import { 
  Hash, FileText, FileCheck, Loader2, Save, 
  ChevronDown, Calendar, Truck, Sparkles, ToggleLeft, ToggleRight
} from 'lucide-react';
import { Modal } from './Modal';

interface Props {
  company: Company;
}

const MONTHS = [
  { id: 1, name: 'Januari' }, { id: 2, name: 'Februari' }, { id: 3, name: 'Maret' },
  { id: 4, name: 'April' }, { id: 5, name: 'Mei' }, { id: 6, name: 'Juni' },
  { id: 7, name: 'Juli' }, { id: 8, name: 'Agustus' }, { id: 9, name: 'September' },
  { id: 10, name: 'Oktober' }, { id: 11, name: 'November' }, { id: 12, name: 'Desember' }
];

const romanize = (num: number): string => {
  if (num <= 0) return String(num);
  const lookup: Record<string, number> = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
  let roman = '';
  for (const i in lookup) {
    while (num >= lookup[i]) {
      roman += i;
      num -= lookup[i];
    }
  }
  return roman;
};

export const SalesAutonumberView: React.FC<Props> = ({ company }) => {
  const [settings, setSettings] = useState<AutonumberSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCodeDropdownOpen, setIsCodeDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<Partial<AutonumberSetting>>({
    format_pattern: '', next_number: 1, digit_count: 4, reset_period: 'never', reset_day: 1, reset_month: 1
  });

  const fetchData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('autonumber_settings').select('*').eq('company_id', company.id).order('document_type');
      if (error) throw error;
      
      const expectedTypes = ['quotation', 'proforma', 'delivery_order', 'invoice'];
      const missingTypes = expectedTypes.filter(type => !data?.some(s => s.document_type === type));

      if (missingTypes.length > 0) {
        const defaults = missingTypes.map(type => {
          let prefix = '';
          if (type === 'quotation') prefix = 'QT';
          else if (type === 'proforma') prefix = 'PI';
          else if (type === 'delivery_order') prefix = 'DO';
          else prefix = 'INV';

          return { 
            company_id: company.id, 
            document_type: type, 
            prefix: prefix, 
            format_pattern: `${prefix}/[NUMBER]/[MM]/[YYYY]`, 
            next_number: 1, 
            digit_count: 4, 
            reset_period: 'never' 
          };
        });
        await supabase.from('autonumber_settings').insert(defaults);
        const { data: refreshed } = await supabase.from('autonumber_settings').select('*').eq('company_id', company.id).order('document_type');
        if (refreshed) setSettings(refreshed);
      } else {
        setSettings(data || []);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [company.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsCodeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenEdit = (setting: AutonumberSetting) => { 
    setForm(setting); 
    setIsModalOpen(true); 
  };

  const handleSave = async () => {
    if (!form.id) return;
    setIsProcessing(true);
    try {
      await supabase.from('autonumber_settings').update({ 
        format_pattern: form.format_pattern, 
        next_number: form.next_number, 
        digit_count: form.digit_count, 
        reset_period: form.reset_period,
        reset_day: form.reset_day,
        reset_month: form.reset_month
      }).eq('id', form.id);
      setIsModalOpen(false); 
      fetchData();
    } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
  };

  const getPreview = (pattern: string = '', nextNum: number = 1, digitCount: number = 4) => {
    if (!pattern) return '-';
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const mon = now.toLocaleString('id-ID', { month: 'short' }).toUpperCase();
    const month = now.toLocaleString('id-ID', { month: 'long' }).toUpperCase();
    const yy = String(now.getFullYear()).substring(2);
    const yyyy = String(now.getFullYear());
    const numStr = String(nextNum).padStart(digitCount || 4, '0');

    return pattern
      .replace(/\[NUMBER\]/g, numStr)
      .replace(/\[ROMAN_NUMBER\]/g, romanize(nextNum))
      .replace(/\[DD\]/g, dd)
      .replace(/\[ROMAN_DD\]/g, romanize(now.getDate()))
      .replace(/\[MM\]/g, mm)
      .replace(/\[MON\]/g, mon)
      .replace(/\[MONTH\]/g, month)
      .replace(/\[ROMAN_MM\]/g, romanize(now.getMonth() + 1))
      .replace(/\[YY\]/g, yy)
      .replace(/\[YYYY\]/g, yyyy)
      .replace(/\[ROMAN_YY\]/g, romanize(Number(yy)))
      .replace(/\[ROMAN_YYYY\]/g, romanize(now.getFullYear()));
  };

  const appendTag = (tag: string) => {
    setForm(prev => ({ ...prev, format_pattern: (prev.format_pattern || '') + tag }));
    setIsCodeDropdownOpen(false);
  };

  const codeOptions = [
    { label: 'Nomor urut (1 - 1000000)', tag: '[NUMBER]' },
    { label: 'Nomor urut romawi (I - MMCX)', tag: '[ROMAN_NUMBER]' },
    { label: 'Tanggal (01-31)', tag: '[DD]' },
    { label: 'Tanggal romawi (I-XXXI)', tag: '[ROMAN_DD]' },
    { label: 'Bulan (01-12)', tag: '[MM]' },
    { label: 'Bulan (JAN-DES)', tag: '[MON]' },
    { label: 'Bulan (JANUARI-DESEMBER)', tag: '[MONTH]' },
    { label: 'Bulan romawi (I - XII)', tag: '[ROMAN_MM]' },
    { label: 'Tahun (21-25)', tag: '[YY]' },
    { label: 'Tahun (2021 - 2025)', tag: '[YYYY]' },
    { label: 'Tahun romawi (XXI - XXV)', tag: '[ROMAN_YY]' },
    { label: 'Tahun romawi (MMXXI - MMXXV)', tag: '[ROMAN_YYYY]' },
  ];

  const getDocStyles = (type: string) => {
    switch (type) {
      case 'quotation': 
        return { 
          icon: <FileText size={24} />, 
          label: 'Penawaran', 
          gradient: 'from-emerald-500 to-teal-600',
          shadow: 'shadow-emerald-100',
          bg: 'bg-emerald-50'
        };
      case 'proforma': 
        return { 
          icon: <FileCheck size={24} />, 
          label: 'Pro Forma Invoice', 
          gradient: 'from-indigo-500 to-purple-600',
          shadow: 'shadow-indigo-100',
          bg: 'bg-indigo-50'
        };
      case 'delivery_order': 
        return { 
          icon: <Truck size={24} />, 
          label: 'Delivery Order', 
          gradient: 'from-amber-500 to-orange-600',
          shadow: 'shadow-amber-100',
          bg: 'bg-amber-50'
        };
      default: 
        return { 
          icon: <FileCheck size={24} />, 
          label: 'Invoice', 
          gradient: 'from-blue-500 to-sky-600',
          shadow: 'shadow-blue-100',
          bg: 'bg-blue-50'
        };
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-blue-600 mb-4" /><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Memuat Pengaturan...</p></div>;

  return (
    <div className="max-w-5xl space-y-10 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settings.map(s => {
          const style = getDocStyles(s.document_type);
          return (
            <div 
              key={s.id} 
              onClick={() => handleOpenEdit(s)} 
              className={`bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:border-transparent transition-all cursor-pointer group relative overflow-hidden`}
            >
              <div className={`absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity`}>
                 {style.icon}
              </div>
              
              <div className="flex items-center gap-5 mb-6">
                 <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${style.gradient} text-white flex items-center justify-center transition-all duration-500 shadow-lg ${style.shadow} group-hover:scale-110`}>
                   {/* Fix: use style.icon directly as ReactNode */}
                   {style.icon}
                 </div>
                 <div>
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-0.5">Automated Numbering</h4>
                    <h3 className="text-lg font-bold text-gray-900">{style.label}</h3>
                 </div>
              </div>

              <div className={`p-5 ${style.bg} border border-transparent group-hover:border-white rounded-2xl transition-all`}>
                 <p className="text-[12px] font-bold text-gray-600 group-hover:text-blue-700 tracking-tight flex items-center gap-2">
                    <Sparkles size={14} className="opacity-50" />
                    {getPreview(s.format_pattern, s.next_number, s.digit_count)}
                 </p>
              </div>
            </div>
          );
        })}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={`Penomoran ${getDocStyles(form.document_type || '').label}`} 
        size="lg"
      >
        <div className="space-y-6 py-2">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              
              {/* Kolom Kiri: Format & Preview */}
              <div className="space-y-6">
                 <div className="space-y-3">
                    <label className="text-[11px] font-bold text-gray-700 flex items-center gap-2">
                      <Hash size={14} className="text-blue-500" />
                      Format Penomoran <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex flex-col gap-3">
                      <div className="relative">
                        <input 
                          type="text" 
                          value={form.format_pattern || ''} 
                          onChange={e => setForm({...form, format_pattern: e.target.value})} 
                          className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner" 
                          placeholder="Contoh: QT/[NUMBER]/[MM]/[YYYY]"
                        />
                      </div>
                      
                      <div className="relative" ref={dropdownRef}>
                        <button 
                          onClick={() => setIsCodeDropdownOpen(!isCodeDropdownOpen)} 
                          className="w-full h-11 px-5 bg-white border border-gray-200 text-gray-600 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-between hover:bg-gray-50 transition-all shadow-sm"
                        >
                          <span>Tambah Tag Kode</span> 
                          <ChevronDown size={14} className={`transition-transform duration-300 ${isCodeDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isCodeDropdownOpen && (
                          <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white border border-gray-100 shadow-2xl rounded-2xl p-2 z-[100] animate-in zoom-in-95 duration-200 overflow-hidden">
                             <div className="max-h-56 overflow-y-auto custom-scrollbar">
                               {codeOptions.map(t => (
                                  <button 
                                    key={t.tag} 
                                    onClick={() => appendTag(t.tag)} 
                                    className="w-full text-left px-4 py-2.5 text-[10px] font-bold text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all border-b border-gray-50 last:border-none uppercase tracking-tighter"
                                  >
                                    {t.label}
                                  </button>
                               ))}
                             </div>
                          </div>
                        )}
                      </div>
                    </div>
                 </div>

                 <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100/50 space-y-2">
                    <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Contoh Output Saat Ini</label>
                    <p className="text-[13px] font-bold text-blue-700 tracking-tight break-all">
                      {getPreview(form.format_pattern, form.next_number, form.digit_count)}
                    </p>
                 </div>
              </div>

              {/* Kolom Kanan: Counter & Reset */}
              <div className="space-y-6">
                 <div className="space-y-3">
                    <label className="text-[11px] font-bold text-gray-700 flex items-center gap-2">
                       <Hash size={14} className="text-blue-500" />
                       Nomor Urut Berikutnya <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="number" 
                      value={form.next_number} 
                      onChange={e => setForm({...form, next_number: Number(e.target.value)})} 
                      className="w-full h-12 px-5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm text-blue-600 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner" 
                    />
                 </div>

                 <div className="space-y-4">
                    <label className="text-[11px] font-bold text-gray-700 flex items-center gap-2">
                       <Calendar size={14} className="text-blue-500" />
                       Reset Nomor Berkala <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                       {[
                         { id: 'never', label: 'Tidak pernah reset' },
                         { id: 'monthly', label: 'Setiap bulan' },
                         { id: 'yearly', label: 'Setiap tahun' }
                       ].map((opt) => (
                         <label key={opt.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${form.reset_period === opt.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                            <div className="relative flex items-center justify-center">
                              <input 
                                type="radio" 
                                name="reset_period" 
                                checked={form.reset_period === opt.id}
                                onChange={() => setForm({...form, reset_period: opt.id as any})}
                                className="peer w-4 h-4 appearance-none border-2 border-gray-300 rounded-full checked:border-blue-600 transition-all" 
                              />
                              <div className="absolute w-2 h-2 bg-blue-600 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                            </div>
                            <span className={`text-[12px] font-bold ${form.reset_period === opt.id ? 'text-blue-700' : 'text-gray-500'}`}>{opt.label}</span>
                         </label>
                       ))}
                    </div>

                    {/* Reset Details Grid */}
                    {form.reset_period !== 'never' && (
                       <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-300">
                          {form.reset_period === 'yearly' && (
                             <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Bulan</span>
                                <div className="relative">
                                   <select 
                                     value={form.reset_month || 1} 
                                     onChange={e => setForm({...form, reset_month: Number(e.target.value)})}
                                     className="w-full pl-4 pr-10 h-10 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none cursor-pointer hover:border-blue-500 appearance-none shadow-sm"
                                   >
                                      {MONTHS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                   </select>
                                   <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                                </div>
                             </div>
                          )}

                          <div className="space-y-1.5">
                             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Tanggal</span>
                             <div className="relative">
                                <select 
                                  value={form.reset_day || 1} 
                                  onChange={e => setForm({...form, reset_day: Number(e.target.value)})}
                                  className="w-full pl-4 pr-10 h-10 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none cursor-pointer hover:border-blue-500 appearance-none shadow-sm"
                                >
                                   {Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                             </div>
                          </div>
                       </div>
                    )}
                 </div>
              </div>
           </div>

           <div className="pt-6 flex justify-end gap-3 border-t border-gray-50 mt-2">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 bg-white border border-gray-200 rounded-xl font-bold text-[10px] uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all"
              >
                Batal
              </button>
              <button 
                onClick={handleSave} 
                disabled={isProcessing}
                className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-gray-100 hover:bg-black active:scale-95 transition-all flex items-center gap-2"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} 
                Update Konfigurasi
              </button>
           </div>
        </div>
      </Modal>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
};
