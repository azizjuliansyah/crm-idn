import React, { useState, useEffect } from 'react';
import { Input, Button, H3, Subtext, Label, Modal } from '@/components/ui';

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
        await supabase
          .from('company_email_settings')
          .update(payload)
          .eq('id', settings.id);
      } else {
        await supabase
          .from('company_email_settings')
          .insert(payload);
      }

      await fetchSettings();
      setNotification({ isOpen: true, title: 'Berhasil', message: 'Konfigurasi Email berhasil disimpan.', type: 'success' });
    } catch (err: any) {
      setNotification({ isOpen: true, title: 'Gagal', message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-indigo-600 mb-4" /><Subtext className="text-[10px]  uppercase tracking-tight text-gray-400">Memuat Konfigurasi Email...</Subtext></div>;

  return (
    <div className="max-w-3xl">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="p-8 border-b border-gray-50 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Mail size={24} />
          </div>
          <div>
            <H3 className="text-xl  text-gray-900 tracking-tight">Konfigurasi Email (Mailketing)</H3>
            <Subtext className="text-sm text-gray-400 font-medium">Hubungkan workspace Anda dengan layanan Mailketing untuk pengiriman email transaksional.</Subtext>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-6">
          <div className="space-y-2">
            <Label className="uppercase tracking-tight">Mailketing API Token</Label>
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
              <Label className="uppercase tracking-tight">Nama Pengirim (From Name)</Label>
              <Input
                type="text"
                value={fromName}
                onChange={(e: any) => setFromName(e.target.value)}
                className="!py-3 text-sm"
                placeholder="Ex: PT Solusi Digital"
              />
            </div>
            <div className="space-y-2">
              <Label className="uppercase tracking-tight">Email Pengirim (Sender Email)</Label>
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

      <Modal isOpen={notification.isOpen} onClose={() => setNotification({ ...notification, isOpen: false })} title="" size="sm">
        <div className="flex flex-col items-center py-6 text-center">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
            {notification.type === 'success' ? <Check size={24} /> : <AlertTriangle size={24} />}
          </div>
          <H3 className="text-lg  text-gray-900 mb-2">{notification.title}</H3>
          <Subtext className="text-sm text-gray-500 font-medium mb-6">{notification.message}</Subtext>
          <Button onClick={() => setNotification({ ...notification, isOpen: false })} className="w-full !py-3 shadow-xl">Tutup</Button>
        </div>
      </Modal>
    </div>
  );
};
