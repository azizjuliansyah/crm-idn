'use client';

import React, { useState } from 'react';
import { 
  Monitor, LayoutGrid, Loader2, ShieldCheck, Save, Info 
} from 'lucide-react';
import { 
  Button, Input, Label, H3, Subtext, Card, Toast, ToastType, Toggle 
} from '@/components/ui';
import { PlatformSettings } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface AdminPlatformSettingsViewProps {
  initialSettings: PlatformSettings | null;
}

const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<Blob> => {
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
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Compression failed'));
        }, 'image/jpeg', quality);
      };
    };
    reader.onerror = (error) => reject(error);
  });
};

export const AdminPlatformSettingsView: React.FC<AdminPlatformSettingsViewProps> = ({ 
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
  const [uploading, setUploading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
    isOpen: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .update({
          name: platformSettings.name,
          logo_url: platformSettings.logo_url,
          hcaptcha_enabled: platformSettings.hcaptcha_enabled,
          hcaptcha_site_key: platformSettings.hcaptcha_site_key,
        })
        .eq('is_singleton', true);

      if (error) throw error;
      showToast('Pengaturan platform telah diperbarui.');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading('logo_url');
    try {
      const compressedBlob = await compressImage(file);
      const fileName = `platform-logo-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('platform')
        .upload(fileName, compressedBlob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('platform').getPublicUrl(fileName);
      setPlatformSettings({ ...platformSettings, logo_url: publicUrl });
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      <Card
        contentClassName="p-10"
        title={
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
              <Monitor size={32} />
            </div>
            <div>
              <H3 className="text-2xl text-gray-900">Identitas Platform</H3>
              <Subtext>Atur nama dan logo sistem yang muncul di halaman login.</Subtext>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSaveSettings} className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <Input
                label="Nama Aplikasi Platform"
                type="text"
                value={platformSettings.name}
                onChange={e => setPlatformSettings({ ...platformSettings, name: e.target.value })}
              />

              <div className="space-y-4">
                <Label>Logo Platform</Label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center overflow-hidden relative shadow-inner">
                    {platformSettings.logo_url ? <img src={platformSettings.logo_url} className="w-full h-full object-contain p-2" /> : <LayoutGrid size={24} className="text-gray-200" />}
                    {uploading === 'logo_url' && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={16} /></div>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-medium uppercase  cursor-pointer hover:bg-blue-100 transition-all">
                      Ganti Logo
                      <input type="file" className="hidden" accept="image/*" onChange={handleUploadLogo} disabled={!!uploading} />
                    </label>
                    {platformSettings.logo_url && <Button variant="ghost" size="sm" onClick={() => setPlatformSettings({ ...platformSettings, logo_url: '' })} className="text-[9px] text-rose-500 lowercase p-0 hover:bg-transparent">Hapus Logo</Button>}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-indigo-600" />
                    <Label className="text-[11px] text-indigo-900">Keamanan hCaptcha</Label>
                  </div>
                  <Toggle
                    checked={!!platformSettings.hcaptcha_enabled}
                    onChange={(val) => setPlatformSettings({ ...platformSettings, hcaptcha_enabled: val })}
                    variant="blue"
                  />
                </div>

                <Input
                  label="hCaptcha Site Key"
                  type="text"
                  value={platformSettings.hcaptcha_site_key || ''}
                  onChange={e => setPlatformSettings({ ...platformSettings, hcaptcha_site_key: e.target.value })}
                  disabled={!platformSettings.hcaptcha_enabled}
                  className="font-mono text-xs"
                  placeholder="Pasted your site key here..."
                />

                <div className="flex gap-3">
                  <Info size={14} className="text-indigo-400 shrink-0" />
                  <Subtext className="text-[9px] text-indigo-600 leading-relaxed italic">Aktifkan perlindungan hCaptcha pada halaman login untuk mencegah serangan brute force bot.</Subtext>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-8 border-t border-gray-50">
            <Button
              type="submit"
              isLoading={isProcessing}
              variant="primary"
              className="px-10 bg-gray-900 hover:bg-black"
              leftIcon={<Save size={16} />}
            >
              Simpan Pengaturan Platform
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
