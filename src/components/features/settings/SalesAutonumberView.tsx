'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

import { Input, Button, Table, TableHeader, TableBody, TableRow, TableCell, H2, Subtext, Label, Modal, ComboBox, Toast, ToastType } from '@/components/ui';
import { ActionButton } from '@/components/shared/buttons/ActionButton';


import { supabase } from '@/lib/supabase';
import { Company, AutonumberSetting } from '@/lib/types';
import {
  Hash, FileText, FileCheck, Loader2, Save,
  ChevronDown, Calendar, Truck, Sparkles, ToggleLeft, ToggleRight
} from 'lucide-react';

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

  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
    isOpen: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  const fetchData = useCallback(async (isInitial = false) => {
    if (!company?.id) return;
    if (isInitial) setLoading(true);
    try {
      const { data, error } = await supabase.from('autonumber_settings').select('*').eq('company_id', company.id).order('document_type');
      if (error) throw error;

      const expectedTypes = ['quotation', 'proforma', 'delivery_order', 'invoice', 'kwitansi'];
      const missingTypes = expectedTypes.filter(type => !data?.some(s => s.document_type === type));

      if (missingTypes.length > 0) {
        const defaults = missingTypes.map(type => {
          let prefix = '';
          if (type === 'quotation') prefix = 'QT';
          else if (type === 'proforma') prefix = 'PI';
          else if (type === 'delivery_order') prefix = 'DO';
          else if (type === 'invoice') prefix = 'INV';
          else prefix = 'KWT';

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
    } catch (err) { console.error(err); } finally {
      if (isInitial) setLoading(false);
    }
  }, [company.id]);

  useEffect(() => { fetchData(true); }, [fetchData]);

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
      await fetchData();
      showToast('Konfigurasi penomoran berhasil diperbarui.');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally { setIsProcessing(false); }
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
          icon: <FileText size={18} />,
          label: 'Penawaran',
          gradient: 'from-emerald-500 to-teal-600',
          shadow: 'shadow-emerald-100',
          bg: 'bg-emerald-50'
        };
      case 'proforma':
        return {
          icon: <FileCheck size={18} />,
          label: 'Proforma Invoice',
          gradient: 'from-indigo-500 to-purple-600',
          shadow: 'shadow-indigo-100',
          bg: 'bg-indigo-50'
        };
      case 'delivery_order':
        return {
          icon: <Truck size={18} />,
          label: 'Delivery Order',
          gradient: 'from-amber-500 to-orange-600',
          shadow: 'shadow-amber-100',
          bg: 'bg-amber-50'
        };
      case 'kwitansi':
        return {
          icon: <FileText size={18} />,
          label: 'Kwitansi',
          gradient: 'from-fuchsia-500 to-pink-600',
          shadow: 'shadow-fuchsia-100',
          bg: 'bg-fuchsia-50'
        };
      default:
        return {
          icon: <FileCheck size={18} />,
          label: 'Invoice',
          gradient: 'from-blue-500 to-sky-600',
          shadow: 'shadow-blue-100',
          bg: 'bg-blue-50'
        };
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-blue-600 mb-4" /><Subtext className="text-[10px]  uppercase  text-gray-400">Memuat Pengaturan...</Subtext></div>;

  return (
    <div className="max-w-5xl flex flex-col space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div>
          <H2 className="text-xl ">Format Nomor Otomatis</H2>
          <Subtext className="text-[10px] uppercase font-semibold text-gray-400">Atur pola penomoran dokumen untuk Quotation, Proforma, Invoice, dan Kwitansi.</Subtext>
        </div>
        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-sm">
          <Hash size={20} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader>Tipe Dokumen</TableCell>
              <TableCell isHeader>Contoh Output (Preview)</TableCell>
              <TableCell isHeader className="text-center">Aksi</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {settings.map(s => {
              const style = getDocStyles(s.document_type);
              return (
                <TableRow key={s.id} className="group cursor-pointer" onClick={() => handleOpenEdit(s)}>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${style.gradient} text-white flex items-center justify-center shadow-md ${style.shadow}`}>
                        {style.icon}
                      </div>
                      <div>
                        <Label className="text-sm font-semibold text-gray-900">{style.label}</Label>
                        <Subtext className="text-[10px] text-gray-400 uppercase tracking-wider block">ID: {s.document_type}</Subtext>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 ${style.bg} border border-transparent rounded-xl transition-all`}>
                      <Sparkles size={12} className="text-blue-400 opacity-70" />
                      <span className="text-[13px] font-mono font-medium text-gray-700">
                        {getPreview(s.format_pattern, s.next_number, s.digit_count)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center">
                      <ActionButton
                        icon={Save}
                        variant="blue"
                        title="Edit Konfigurasi"
                        onClick={(e) => { e.stopPropagation(); handleOpenEdit(s); }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Penomoran ${getDocStyles(form.document_type || '').label}`}
        size="lg"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
              className="!px-6 !py-3 !text-gray-400"
            >
              Batal
            </Button>
            <Button
              onClick={handleSave}
              isLoading={isProcessing}
              leftIcon={<Save size={16} />}
              className="!px-8 !py-3 shadow-xl"
            >
              Update Konfigurasi
            </Button>
          </div>
        }
      >
        <div className="space-y-6 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

            {/* Kolom Kiri: Format & Preview */}
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Hash size={14} className="text-blue-500" />
                  Format Penomoran <Label className="text-rose-500">*</Label>
                </Label>
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <Input
                      type="text"
                      value={form.format_pattern || ''}
                      onChange={(e: any) => setForm({ ...form, format_pattern: e.target.value })}
                      className="!h-12 !px-4"
                      placeholder="Contoh: QT/[NUMBER]/[MM]/[YYYY]"
                    />
                  </div>

                  <div className="relative" ref={dropdownRef}>
                    <Button
                      variant="ghost"
                      onClick={() => setIsCodeDropdownOpen(!isCodeDropdownOpen)}
                      className="w-full !h-11 !px-5 bg-white border border-gray-200 !text-gray-600 !text-[10px]  uppercase  !justify-between shadow-sm"
                      rightIcon={<ChevronDown size={14} className={`transition-transform duration-300 ${isCodeDropdownOpen ? 'rotate-180' : ''}`} />}
                    >
                      <Label>Tambah Tag Kode</Label>
                    </Button>
                    {isCodeDropdownOpen && (
                      <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white border border-gray-100 shadow-2xl rounded-2xl p-2 z-[100] overflow-hidden">
                        <div className="max-h-56 overflow-y-auto custom-scrollbar">
                          {codeOptions.map(t => (
                            <Button
                              key={t.tag}
                              variant="ghost"
                              onClick={() => appendTag(t.tag)}
                              className="w-full !justify-start !px-4 !py-2.5 !text-[10px]  !text-gray-500 hover:!bg-blue-50 hover:!text-blue-600 !rounded-lg border-b border-gray-50 last:border-none uppercase "
                            >
                              {t.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100/50 space-y-2">
                <Label className="!text-blue-400">Contoh Output Saat Ini</Label>
                <Subtext className="text-[13px]  text-blue-700  break-all">
                  {getPreview(form.format_pattern, form.next_number, form.digit_count)}
                </Subtext>
              </div>
            </div>

            {/* Kolom Kanan: Counter & Reset */}
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Hash size={14} className="text-blue-500" />
                  Nomor Urut Berikutnya <Label className="text-rose-500">*</Label>
                </Label>
                <Input
                  type="number"
                  value={form.next_number}
                  onChange={(e: any) => setForm({ ...form, next_number: Number(e.target.value) })}
                  className="!h-12 !px-5 !text-blue-600"
                />
              </div>

              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Calendar size={14} className="text-blue-500" />
                  Reset Nomor Berkala <Label className="text-rose-500">*</Label>
                </Label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'never', label: 'Tidak pernah reset' },
                    { id: 'monthly', label: 'Setiap bulan' },
                    { id: 'yearly', label: 'Setiap tahun' }
                  ].map((opt) => (
                    <Label key={opt.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${form.reset_period === opt.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                      <div className="relative flex items-center justify-center">
                        <Input
                          type="radio"
                          name="reset_period"
                          checked={form.reset_period === opt.id}
                          onChange={() => setForm({ ...form, reset_period: opt.id as any })}
                          className="!peer !w-4 !h-4"
                        />
                        <div className="absolute w-2 h-2 bg-blue-600 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                      </div>
                      <Label className={`text-[12px]  ${form.reset_period === opt.id ? 'text-blue-700' : 'text-gray-500'}`}>{opt.label}</Label>
                    </Label>
                  ))}
                </div>

                {/* Reset Details Grid */}
                {form.reset_period !== 'never' && (
                  <div className="grid grid-cols-2 gap-3">
                    {form.reset_period === 'yearly' && (
                      <div className="space-y-1.5">
                        <Label className="ml-1">Bulan</Label>
                        <ComboBox
                          value={form.reset_month || 1}
                          onChange={(val: string | number) => setForm({ ...form, reset_month: Number(val) })}
                          options={MONTHS.map(m => ({ value: m.id, label: m.name }))}
                          hideSearch={true}
                          className="w-full"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label className="ml-1">Tanggal</Label>
                      <ComboBox
                        value={form.reset_day || 1}
                        onChange={(val: string | number) => setForm({ ...form, reset_day: Number(val) })}
                        options={Array.from({ length: 31 }, (_, i) => i + 1).map(d => ({ value: d, label: d.toString() }))}
                        hideSearch={true}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>
      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
