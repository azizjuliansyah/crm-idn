'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, DocumentTemplateSetting } from '@/lib/types';
import {
  FileText, FileCheck, Loader2, Save, CheckCircle2,
  Layout, Palette, Check, Star, Settings2, Image as ImageIcon,
  Upload, X, Eye, ExternalLink
} from 'lucide-react';
import { Modal } from '@/components/ui';
import { jsPDF } from 'jspdf';
import { generateTemplate1, generateTemplate5, generateTemplate6 } from '@/lib/pdf-templates';

interface Props {
  company: Company;
}

const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.8): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        // Clear canvas with transparency
        ctx?.clearRect(0, 0, width, height);
        ctx?.drawImage(img, 0, 0, width, height);

        // Use image/png to preserve transparency
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Compression failed'));
        }, 'image/png');
      };
    };
    reader.onerror = (error) => reject(error);
  });
};



export const PdfTemplatesSettingsView: React.FC<Props> = ({ company }) => {
  const [settings, setSettings] = useState<DocumentTemplateSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');

  const [configForm, setConfigForm] = useState<any>({
    top_contact: '',
    payment_info: '',
    note_footer: '',
    signature_name: '',
    signature_title: '',
    signature_company: '',
    footer_bar_text: '',
    footer_text: '',
    logo_url: '',
    signature_url: '',
    company_address: '',
    contact_phone_hours: '',
    company_website: '',
    finance_email: ''
  });

  const fetchData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('document_template_settings')
        .select('*')
        .eq('company_id', company.id);

      if (error) throw error;
      setSettings(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [company.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateTemplate = async (docType: 'quotation' | 'invoice' | 'kwitansi', templateId: string) => {
    setIsProcessing(true);
    try {
      const existing = settings.find(s => s.document_type === docType);
      const { error } = await supabase
        .from('document_template_settings')
        .upsert({
          company_id: company.id,
          document_type: docType,
          template_id: templateId,
          config: existing?.config || {},
          updated_at: new Date().toISOString()
        }, { onConflict: 'company_id, document_type' });

      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const openConfig = (docType: string) => {
    const s = settings.find(st => st.document_type === docType);
    if (s) {
      setConfigForm({
        top_contact: s.config?.top_contact || '',
        payment_info: s.config?.payment_info || '',
        note_footer: s.config?.note_footer || '',
        signature_name: s.config?.signature_name || '',
        signature_title: s.config?.signature_title || '',
        signature_company: s.config?.signature_company || '',
        footer_bar_text: s.config?.footer_bar_text || '',
        footer_text: s.config?.footer_text || '',
        logo_url: s.config?.logo_url || '',
        signature_url: s.config?.signature_url || '',
        company_address: s.config?.company_address || '',
        contact_phone_hours: s.config?.contact_phone_hours || '',
        company_website: s.config?.company_website || '',
        finance_email: s.config?.finance_email || ''
      });
      setIsConfiguring(docType);
    } else {
      setConfigForm({
        top_contact: '',
        payment_info: '',
        note_footer: '',
        signature_name: '',
        signature_title: '',
        signature_company: '',
        footer_bar_text: '',
        footer_text: '',
        logo_url: '',
        signature_url: '',
        company_address: '',
        contact_phone_hours: '',
        company_website: '',
        finance_email: ''
      });
      setIsConfiguring(docType);
    }
  };

  const handleSaveConfig = async () => {
    if (!isConfiguring) return;
    setIsProcessing(true);
    try {
      const existing = settings.find(s => s.document_type === isConfiguring);

      if (existing) {
        const { error } = await supabase
          .from('document_template_settings')
          .update({
            config: configForm,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('document_template_settings')
          .insert({
            company_id: company.id,
            document_type: isConfiguring,
            template_id: 'template1',
            config: configForm,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      await fetchData();
      setIsConfiguring(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo_url' | 'signature_url') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(field);
    try {
      const compressedBlob = await compressImage(file);
      const fileName = `template-assets/${company.id}-${field}-${Date.now()}.png`;

      const { error: upErr } = await supabase.storage.from('platform').upload(fileName, compressedBlob, { contentType: 'image/png' });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from('platform').getPublicUrl(fileName);
      setConfigForm({ ...configForm, [field]: publicUrl });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(null);
    }
  };

  const getActiveTemplate = (docType: string) => {
    return settings.find(s => s.document_type === docType)?.template_id || 'template1';
  };

  const formatIDR = (num: number = 0) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num).replace('Rp', 'Rp');
  };

  const formatDateString = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const handlePreview = async (templateId: string, templateName: string, docType: string) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const padX = 18;

    const qData = {
      number: 'QT/2025/SAMPLE/001',
      date: new Date().toISOString().split('T')[0],
      expiry_date: '2025-12-31',
      subtotal: 10000000,
      discount_value: 0,
      tax_value: 1100000,
      total: 11100000,
      client: {
        name: 'John Doe (Sample)',
        salutation: 'Bapak',
        address: 'Jl. Sudirman No. 123, Jakarta Pusat',
        whatsapp: '08123456789',
        email: 'john.sample@example.com',
        client_company: { name: 'PT Sampel Teknologi Indonesia' }
      },
      quotation_items: [
        { products: { name: 'Profesional support' }, description: 'Mikrotik BGP + Server - Juli 2025', qty: 1, unit_name: 'pax', price: 3800000, total: 3800000 },
        { products: { name: 'Cloud Infrastructure' }, description: 'Dedicated resources storage enterprise', qty: 1, unit_name: 'unit', price: 6200000, total: 6200000 },
        { products: { name: 'Cloud Infrastructure 2' }, description: 'Dedicated resources storage enterprise', qty: 1, unit_name: 'unit', price: 6200000, total: 6200000 },
        // { products: { name: 'Cloud Infrastructure 3' }, description: 'Dedicated resources storage enterprise', qty: 1, unit_name: 'unit', price: 6200000, total: 6200000 },
        // { products: { name: 'Cloud Infrastructure 4' }, description: 'Dedicated resources storage enterprise', qty: 1, unit_name: 'unit', price: 6200000, total: 6200000 },
        // { products: { name: 'Cloud Infrastructure 5' }, description: 'Dedicated resources storage enterprise', qty: 1, unit_name: 'unit', price: 6200000, total: 6200000 },
        // { products: { name: 'Cloud Infrastructure 6' }, description: 'Dedicated resources storage enterprise', qty: 1, unit_name: 'unit', price: 6200000, total: 6200000 },
        // { products: { name: 'Cloud Infrastructure 7' }, description: 'Dedicated resources storage enterprise', qty: 1, unit_name: 'unit', price: 6200000, total: 6200000 },
        // { products: { name: 'Cloud Infrastructure 8' }, description: 'Dedicated resources storage enterprise', qty: 1, unit_name: 'unit', price: 6200000, total: 6200000 },
        // { products: { name: 'Cloud Infrastructure 9' }, description: 'Dedicated resources storage enterprise', qty: 1, unit_name: 'unit', price: 6200000, total: 6200000 },
        // { products: { name: 'Cloud Infrastructure 10' }, description: 'Dedicated resources storage enterprise', qty: 1, unit_name: 'unit', price: 6200000, total: 6200000 },
        // { products: { name: 'Cloud Infrastructure 11' }, description: 'Dedicated resources storage enterprise', qty: 1, unit_name: 'unit', price: 6200000, total: 6200000 },
        // { products: { name: 'Cloud Infrastructure 12' }, description: 'Dedicated resources storage enterprise', qty: 1, unit_name: 'unit', price: 6200000, total: 6200000 },
        // { products: { name: 'Cloud Infrastructure 13' }, description: 'Dedicated resources storage enterprise', qty: 1, unit_name: 'unit', price: 6200000, total: 6200000 },
        // { products: { name: 'Cloud Infrastructure 14' }, description: 'Dedicated resources storage enterprise', qty: 1, unit_name: 'unit', price: 6200000, total: 6200000 },
      ]
    };

    const s = settings.find(st => st.document_type === docType);
    const config = s?.config || {
      top_contact: '0851-XXXX-XXXX  |  info@spiznet.com  |  www.spiznet.com',
      company_address: 'info@idn.id\nJl. Anggrek Rosliana no 12A Slipi\nPalmerah Jakarta Barat 11480',
      contact_phone_hours: '0819-0819-1001\nSenin - Jumat\n09.00 to 17.00 WIB',
      company_website: 'www.idn.id',
      finance_email: 'finance@idn.id',
      payment_info: 'Bank MANDIRI 1650003926038 a.n. SPIZNET',
      note_footer: '- Please send payment confirmation\n- Terms & conditions apply',
      signature_name: 'Administrator',
      signature_title: 'Sales Administrative Assistant',
      signature_company: company.name,
      footer_bar_text: 'Thank you for your business',
      footer_text: `${company.name} | Professional Services`
    };

    config.document_type = docType;

    if (templateId === 'template5') {
      await generateTemplate5(doc, qData, config, company, pageWidth, padX);
    } else if (templateId === 'template6') {
      await generateTemplate6(doc, qData, config, company, pageWidth, padX);
    } else if (templateId === 'template1') {
      await generateTemplate1(doc, qData, config, company, pageWidth, padX);
    }

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    setPreviewTitle(templateName);
  };

  const openInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-10 border-b border-gray-50 bg-gray-50/30">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-blue-100">
              <Palette size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-medium text-gray-900 tracking-tight">Katalog Template Dokumen</h3>
              <p className="text-sm text-gray-400 font-medium">Pilih gaya visual untuk penawaran dan invoice perusahaan Anda.</p>
            </div>
          </div>
        </div>

        <div className="p-10 space-y-12">
          {['quotation', 'invoice', 'kwitansi'].map((type) => (
            <div key={type} className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${type === 'quotation' ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'}`}>
                    {type === 'quotation' ? <FileText size={20} /> : <FileCheck size={20} />}
                  </div>
                  <div>
                    <h4 className="text-[10px] font-medium text-gray-400 uppercase tracking-[0.2em]">Dokumen</h4>
                    <h5 className="text-lg font-medium text-gray-900 capitalize">{type === 'invoice' ? 'Invoice & Proforma' : type === 'kwitansi' ? 'Kwitansi' : type}</h5>
                  </div>
                </div>
                <button
                  onClick={() => openConfig(type)}
                  className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-[10px] font-medium uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-2"
                >
                  <Settings2 size={14} /> Konfigurasi Konten
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { id: 'template1', name: 'Classic Blue', desc: 'Desain standar yang bersih dan profesional.' },
                  { id: 'template5', name: 'Premium Teal Banner', desc: 'Modern dengan header warna solid yang elegan.' },
                  { id: 'template6', name: 'IDN Professional', desc: 'Desain formal IDN template dengan banner terperinci.' },
                ].map((tmpl) => {
                  const isActive = getActiveTemplate(type) === tmpl.id;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => handleUpdateTemplate(type as any, tmpl.id)}
                      className={`relative p-6 rounded-3xl border transition-all cursor-pointer group flex flex-col justify-between h-48 ${isActive ? 'bg-indigo-50/50 border-indigo-200 shadow-lg shadow-indigo-100/50' : 'bg-white border-gray-100 hover:border-indigo-100'}`}
                    >
                      {isActive && (
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white z-10 animate-in zoom-in">
                          <Check size={16} strokeWidth={4} />
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h6 className="font-medium text-gray-900 tracking-tight">{tmpl.name}</h6>
                          {tmpl.id === 'template5' && <Star size={14} className="text-amber-400 fill-amber-400" />}
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">{tmpl.desc}</p>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePreview(tmpl.id, tmpl.name, type); }}
                          className="px-4 py-2 bg-white border border-gray-100 rounded-lg text-[10px] font-medium uppercase tracking-widest text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center gap-2"
                        >
                          <Eye size={12} /> Preview
                        </button>
                        {isActive && <span className="text-[9px] font-medium text-indigo-400 uppercase tracking-widest">AKTIF</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal
        isOpen={isConfiguring !== null}
        onClose={() => setIsConfiguring(null)}
        title={`Konfigurasi Dokumen: ${isConfiguring}`}
        size="lg"
        footer={<button onClick={handleSaveConfig} disabled={isProcessing} className="px-10 py-4 bg-indigo-600 text-white rounded-xl font-medium text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center gap-2">{isProcessing && <Loader2 className="animate-spin" size={14} />} Simpan Konfigurasi</button>}
      >
        <div className="space-y-10 py-4">
          {/* Section Header */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-gray-50">
              <Layout size={16} className="text-indigo-500" />
              <h4 className="text-[11px] font-medium uppercase tracking-widest text-gray-900">Branding & Header</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Logo Kustom</p>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center overflow-hidden relative shadow-inner">
                    {configForm.logo_url ? <img src={configForm.logo_url} className="w-full h-full object-contain p-2" /> : <ImageIcon size={24} className="text-gray-200" />}
                    {uploading === 'logo_url' && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin" size={16} /></div>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-medium uppercase tracking-widest cursor-pointer hover:bg-indigo-100 transition-all">
                      Upload Logo
                      <input type="file" className="hidden" accept="image/*" onChange={e => handleUploadImage(e, 'logo_url')} disabled={!!uploading} />
                    </label>
                    {configForm.logo_url && <button onClick={() => setConfigForm({ ...configForm, logo_url: '' })} className="text-[9px] font-medium text-rose-500 uppercase tracking-widest hover:underline">Hapus Logo</button>}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-medium text-gray-400 uppercase tracking-widest ml-1">Kontak Header (Single Line for Template 1&5)</label>
                <input type="text" value={configForm.top_contact} onChange={e => setConfigForm({ ...configForm, top_contact: e.target.value })} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs" placeholder="Misal: 0851-XXXX | info@company.com" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-medium text-gray-400 uppercase tracking-widest ml-1">Alamat Kontak (Multi Line for Template 6)</label>
                <textarea value={configForm.company_address} onChange={e => setConfigForm({ ...configForm, company_address: e.target.value })} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs h-20 resize-none" placeholder="info@idn.id\nJl. Anggrek..." />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-medium text-gray-400 uppercase tracking-widest ml-1">Jam Kerja & Telepon (Multi Line for Template 6)</label>
                <textarea value={configForm.contact_phone_hours} onChange={e => setConfigForm({ ...configForm, contact_phone_hours: e.target.value })} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs h-20 resize-none" placeholder="0819-0819-1001\nSenin - Jumat..." />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-medium text-gray-400 uppercase tracking-widest ml-1">Website Perusahaan (Template 6)</label>
                <input type="text" value={configForm.company_website} onChange={e => setConfigForm({ ...configForm, company_website: e.target.value })} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs" placeholder="www.idn.id" />
              </div>
            </div>
          </div>

          {/* Section Payment */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-gray-50">
              <Settings2 size={16} className="text-emerald-500" />
              <h4 className="text-[11px] font-medium uppercase tracking-widest text-gray-900">Informasi Pembayaran & Catatan</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-medium text-gray-400 uppercase tracking-widest ml-1">Instruksi Pembayaran</label>
                <textarea value={configForm.payment_info} onChange={e => setConfigForm({ ...configForm, payment_info: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs h-24 resize-none" placeholder="Bank Mandiri No. Rek ..." />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-medium text-gray-400 uppercase tracking-widest ml-1">Email Finance (Bukti Pembayaran)</label>
                <input type="text" value={configForm.finance_email} onChange={e => setConfigForm({ ...configForm, finance_email: e.target.value })} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs" placeholder="finance@idn.id" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-medium text-gray-400 uppercase tracking-widest ml-1">Catatan Kaki (Note)</label>
                <textarea value={configForm.note_footer} onChange={e => setConfigForm({ ...configForm, note_footer: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs h-24 resize-none" placeholder="- Berlaku 7 hari..." />
              </div>
            </div>
          </div>

          {/* Section Signature */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-gray-50">
              <Star size={16} className="text-amber-500" />
              <h4 className="text-[11px] font-medium uppercase tracking-widest text-gray-900">Tanda Tangan & Footer Bar</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-4">
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Gambar Tanda Tangan (PNG Transparan)</p>
                <div className="flex items-center gap-4">
                  <div className="w-40 h-24 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center overflow-hidden relative shadow-inner">
                    {configForm.signature_url ? <img src={configForm.signature_url} className="w-full h-full object-contain" /> : <ImageIcon size={24} className="text-gray-200" />}
                    {uploading === 'signature_url' && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin" size={16} /></div>}
                  </div>
                  <label className="px-4 py-2 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-medium uppercase tracking-widest cursor-pointer hover:bg-amber-100 transition-all">
                    Upload TTD
                    <input type="file" className="hidden" accept="image/*" onChange={e => handleUploadImage(e, 'signature_url')} disabled={!!uploading} />
                  </label>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-medium text-gray-400 uppercase tracking-widest ml-1">Nama Penanda Tangan</label>
                  <input type="text" value={configForm.signature_name} onChange={e => setConfigForm({ ...configForm, signature_name: e.target.value })} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs" placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-medium text-gray-400 uppercase tracking-widest ml-1">Jabatan Penanda Tangan</label>
                  <input type="text" value={configForm.signature_title} onChange={e => setConfigForm({ ...configForm, signature_title: e.target.value })} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs" placeholder="Sales Admin" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-medium text-gray-400 uppercase tracking-widest ml-1">Nama Perusahaan Penanda Tangan</label>
                  <input type="text" value={configForm.signature_company} onChange={e => setConfigForm({ ...configForm, signature_company: e.target.value })} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs" placeholder={company.name} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-medium text-gray-400 uppercase tracking-widest ml-1">Teks di Bar Footer</label>
                <input type="text" value={configForm.footer_bar_text} onChange={e => setConfigForm({ ...configForm, footer_bar_text: e.target.value })} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs" placeholder="Thank you for your business" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-medium text-gray-400 uppercase tracking-widest ml-1">Teks Footer Kecil</label>
                <input type="text" value={configForm.footer_text} onChange={e => setConfigForm({ ...configForm, footer_text: e.target.value })} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs" placeholder="Your Company | Professional Solution" />
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* PDF PREVIEW MODAL */}
      <Modal
        isOpen={!!previewUrl}
        onClose={() => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
        title={`Preview Template: ${previewTitle}`}
        size="xl"
      >
        <div className="flex flex-col h-[75vh]">
          <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
            <p className="text-[11px] text-gray-500 font-medium">Beberapa browser mungkin memblokir pratinjau di dalam frame.</p>
            <button
              onClick={openInNewTab}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-medium uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-sm"
            >
              <ExternalLink size={14} /> Buka di Tab Baru
            </button>
          </div>
          <div className="flex-1 w-full bg-gray-100 rounded-b-xl overflow-hidden shadow-inner border border-gray-200">
            {previewUrl && <iframe src={previewUrl} className="w-full h-full" title="PDF Preview" />}
          </div>
        </div>
      </Modal>
    </div>
  );
};
