import React, { useState, useEffect } from 'react';
import { Button, H3, Subtext, Modal } from '@/components/ui';

import { supabase } from '@/lib/supabase';
import { Company, DocumentTemplateSetting } from '@/lib/types';
import { Loader2, Save, FileText, Check, LayoutTemplate } from 'lucide-react';

interface Props {
  company: Company;
}

const DOCUMENT_TYPES = [
  { id: 'quotation', label: 'Penawaran Harga (Quotation)' },
  { id: 'proforma', label: 'Proforma Invoice' },
  { id: 'invoice', label: 'Invoice / Faktur' },
];

const TEMPLATE_OPTIONS = [
  { id: 'modern', name: 'Modern Clean', description: 'Tampilan bersih dengan aksen warna perusahaan.' },
  { id: 'classic', name: 'Classic Professional', description: 'Gaya formal dan tradisional.' },
  { id: 'bold', name: 'Bold Header', description: 'Header tebal untuk penekanan branding.' },
];

export const PdfTemplatesSettingsView: React.FC<Props> = ({ company }) => {
  const [settings, setSettings] = useState<DocumentTemplateSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'quotation' | 'proforma' | 'invoice'>('quotation');
  const [notification, setNotification] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' }>({
    isOpen: false, title: '', message: '', type: 'success'
  });

  useEffect(() => {
    fetchSettings();
  }, [company.id]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('document_template_settings')
        .select('*')
        .eq('company_id', company.id);

      if (data) setSettings(data);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentSetting = (type: string) => {
    return settings.find(s => s.document_type === type);
  };

  const handleSave = async (templateId: string) => {
    setIsProcessing(true);
    try {
      const current = getCurrentSetting(activeTab);

      const payload = {
        company_id: company.id,
        document_type: activeTab,
        template_id: templateId,
        config: current?.config || {}, // Preserve existing config or init empty
        updated_at: new Date().toISOString()
      };

      if (current) {
        await supabase
          .from('document_template_settings')
          .update(payload)
          .eq('id', current.id);
      } else {
        await supabase
          .from('document_template_settings')
          .insert(payload);
      }

      await fetchSettings();
      setNotification({ isOpen: true, title: 'Berhasil', message: `Template ${activeTab} berhasil disimpan.`, type: 'success' });
    } catch (err: any) {
      setNotification({ isOpen: true, title: 'Gagal', message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-blue-600 mb-4" /><Subtext className="text-[10px]  uppercase tracking-tight text-gray-400">Memuat Pengaturan Template...</Subtext></div>;

  const currentTemplateId = getCurrentSetting(activeTab)?.template_id || 'modern'; // Default to modern

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="p-8 border-b border-gray-50">
          <H3 className="text-lg text-gray-900 tracking-tight">Desain Dokumen PDF</H3>
          <Subtext className="text-xs text-gray-400 font-medium mt-1 tracking-tight">Pilih tata letak dan desain untuk dokumen bisnis Anda.</Subtext>
        </div>

        <div className="flex border-b border-gray-100">
          {DOCUMENT_TYPES.map(type => (
            <Button
              key={type.id}
              variant="ghost"
              onClick={() => setActiveTab(type.id as any)}
              className={`flex-1 !py-4 !text-xs  uppercase tracking-tight transition-all !rounded-none border-b-2 shadow-none ${activeTab === type.id
                ? 'border-blue-600 !text-blue-600 bg-blue-50/50'
                : 'border-transparent !text-gray-400 hover:!text-gray-600 hover:bg-gray-50'
                }`}
            >
              {type.label}
            </Button>
          ))}
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TEMPLATE_OPTIONS.map(template => {
              const isActive = currentTemplateId === template.id;
              return (
                <div
                  key={template.id}
                  onClick={() => !isProcessing && handleSave(template.id)}
                  className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${isActive
                    ? 'border-blue-600 bg-blue-50/30'
                    : 'border-gray-100 hover:border-gray-200 bg-white'
                    }`}
                >
                  {isActive && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-sm">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}

                  {/* Mock Preview */}
                  <div className="aspect-[210/297] bg-white border border-gray-100 shadow-sm rounded-lg mb-4 overflow-hidden flex flex-col p-2">
                    {/* Header Mock */}
                    <div className={`h-8 w-full mb-2 rounded ${template.id === 'bold' ? 'bg-gray-800' : 'bg-gray-100'}`}></div>
                    <div className="space-y-1">
                      <div className="h-1 w-1/3 bg-gray-100 rounded"></div>
                      <div className="h-1 w-1/4 bg-gray-50 rounded"></div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="h-2 w-full bg-gray-50 rounded"></div>
                      <div className="h-2 w-full bg-gray-50 rounded"></div>
                      <div className="h-2 w-full bg-gray-50 rounded"></div>
                    </div>
                  </div>

                  <h4 className={`text-sm tracking-tight ${isActive ? 'text-blue-700' : 'text-gray-900'}`}>{template.name}</h4>
                  <Subtext className="text-xs text-gray-400 mt-1 leading-relaxed tracking-tight">{template.description}</Subtext>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Modal isOpen={notification.isOpen} onClose={() => setNotification({ ...notification, isOpen: false })} title="" size="sm">
        <div className="flex flex-col items-center py-6 text-center">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
            {notification.type === 'success' ? <Check size={24} /> : <FileText size={24} />}
          </div>
          <H3 className="text-lg  text-gray-900 mb-2">{notification.title}</H3>
          <Subtext className="text-sm text-gray-500 font-medium mb-6">{notification.message}</Subtext>
          <Button onClick={() => setNotification({ ...notification, isOpen: false })} className="w-full !py-3 shadow-xl">Tutup</Button>
        </div>
      </Modal>
    </div>
  );
};
