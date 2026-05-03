import React, { useState, useEffect } from 'react';
import { Input, Button, H2, H3, Subtext, Label, Modal, Toast, ToastType } from '@/components/ui';

import { supabase } from '@/lib/supabase';
import { Company, CompanyEmailSetting } from '@/lib/types';
import { Loader2, Save, Mail, Check, AlertTriangle } from 'lucide-react';

interface Props {
  company: Company;
}

export const EmailSettingsView: React.FC<Props> = ({ company }) => {
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [settings, setSettings] = useState<CompanyEmailSetting | null>(null);

  const [apiToken, setApiToken] = useState('');
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');

  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
    isOpen: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  useEffect(() => {
    fetchSettings();
  }, [company.id]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('company_email_settings')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      if (data) {
        setSettings(data);
        setApiToken(data.mailketing_api_token || '');
        setFromName(data.mailketing_from_name || '');
        setFromEmail(data.mailketing_from_email || '');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const payload = {
        company_id: company.id,
        mailketing_api_token: apiToken,
        mailketing_from_name: fromName,
        mailketing_from_email: fromEmail,
        updated_at: new Date().toISOString()
      };

      if (settings?.id) {
        const { error } = await supabase
          .from('company_email_settings')
          .update(payload)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_email_settings')
          .insert(payload);
        if (error) throw error;
      }

      await fetchSettings();
      showToast('Konfigurasi Email berhasil disimpan.');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-indigo-600 mb-4" /><Subtext className="text-[10px]  uppercase  text-gray-400">Memuat Konfigurasi Email...</Subtext></div>;

  return (
    <div className="max-w-3xl flex flex-col gap-6">
      <div className="bg-white p-4 rounded-2xl border-2 border-gray-300 shadow-none shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border-2 border-indigo-100/50 shadow-none">
            <Mail size={20} strokeWidth={2.5} />
          </div>
          <div>
            <H2 className="text-xl">Konfigurasi Email</H2>
            <Subtext className="text-[10px] uppercase">Workspace Setup</Subtext>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border-2 border-gray-300 overflow-hidden shadow-none flex-1">

        <form onSubmit={handleSave} className="p-8 space-y-6">
          <div className="space-y-2">
            <Label className="uppercase ">Mailketing API Token</Label>
            <Input
              type="password"
              value={apiToken}
              onChange={(e: any) => setApiToken(e.target.value)}
              className="!py-3 font-mono text-sm"
              placeholder="Ex: random_token_string..."
            />
            <Subtext className="text-[11px] text-gray-400">Dapatkan API Key di Dashboard Mailketing.</Subtext>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="uppercase ">Nama Pengirim (From Name)</Label>
              <Input
                type="text"
                value={fromName}
                onChange={(e: any) => setFromName(e.target.value)}
                className="!py-3 text-sm"
                placeholder="Ex: PT Solusi Digital"
              />
            </div>
            <div className="space-y-2">
              <Label className="uppercase ">Email Pengirim (Sender Email)</Label>
              <Input
                type="email"
                value={fromEmail}
                onChange={(e: any) => setFromEmail(e.target.value)}
                className="!py-3 text-sm"
                placeholder="Ex: no-reply@mycompany.com"
              />
              <Subtext className="text-[11px] text-gray-400">Pastikan domain email sudah diverifikasi di Mailketing.</Subtext>
            </div>
          </div>

          <div className="pt-4 flex items-center gap-3">
            <Button
              type="submit"
              isLoading={isProcessing}
              leftIcon={<Save size={16} />}
              variant='primary'
            >
              Simpan Konfigurasi
            </Button>
          </div>
        </form>
      </div>

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
