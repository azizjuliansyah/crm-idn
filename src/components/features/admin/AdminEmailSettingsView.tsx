'use client';

import React, { useState } from 'react';
import { 
  Mail, Save, ExternalLink 
} from 'lucide-react';
import { 
  Button, Input, H3, Subtext, Card, Toast, ToastType 
} from '@/components/ui';
import { PlatformSettings } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface AdminEmailSettingsViewProps {
  initialSettings: PlatformSettings | null;
}

export const AdminEmailSettingsView: React.FC<AdminEmailSettingsViewProps> = ({ 
  initialSettings 
}) => {
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(initialSettings || {
    name: 'CRM Pintar',
    logo_url: '',
    mailketing_api_token: '',
    mailketing_from_name: 'CRM Pintar',
    mailketing_from_email: '',
    hcaptcha_enabled: false,
    hcaptcha_site_key: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
    isOpen: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  const handleSaveEmailSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .update({
          mailketing_api_token: platformSettings.mailketing_api_token,
          mailketing_from_name: platformSettings.mailketing_from_name,
          mailketing_from_email: platformSettings.mailketing_from_email,
        })
        .eq('is_singleton', true);

      if (error) throw error;
      showToast('Konfigurasi Mailketing telah diperbarui.');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <Card
        contentClassName="p-10"
        title={
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-100">
              <Mail size={32} />
            </div>
            <div>
              <H3 className="text-2xl text-gray-900">Mailketing API</H3>
              <Subtext>Email sistem untuk pengiriman OTP, Notifikasi, dll.</Subtext>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSaveEmailSettings} className="space-y-8">
          <div className="space-y-6">
            <Input
              label="Mailketing API Token"
              type="password"
              value={platformSettings.mailketing_api_token || ''}
              onChange={e => setPlatformSettings({ ...platformSettings, mailketing_api_token: e.target.value })}
              className="font-mono text-xs"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Sender Name (From Name)"
                type="text"
                value={platformSettings.mailketing_from_name || ''}
                onChange={e => setPlatformSettings({ ...platformSettings, mailketing_from_name: e.target.value })}
              />
              <Input
                label="Sender Email (From Email)"
                type="email"
                value={platformSettings.mailketing_from_email || ''}
                onChange={e => setPlatformSettings({ ...platformSettings, mailketing_from_email: e.target.value })}
              />
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <Subtext className="text-[10px] leading-relaxed italic">
              API ini digunakan global untuk pengiriman email sistem (transaksional). Pastikan token memiliki kuota pengiriman yang cukup.
              Anda bisa mendapatkan token di <a href="https://mailketing.id" target="_blank" className="text-rose-600 underline inline-flex items-center gap-1">Mailketing.id <ExternalLink size={10} /></a>
            </Subtext>
          </div>

          <div className="flex justify-end pt-6 border-t border-gray-50">
            <Button
              type="submit"
              isLoading={isProcessing}
              variant="primary"
              className="px-10 bg-rose-600 hover:bg-rose-700"
              leftIcon={<Save size={16} />}
            >
              Update API Gateway
            </Button>
          </div>
        </form>
      </Card>

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
