import React, { useState } from 'react';
import { Input, Textarea, Button, H2, Subtext, Label } from '@/components/ui';
import { useAppStore } from '@/lib/store/useAppStore';
import { supabase } from '@/lib/supabase';
import { Company } from '@/lib/types';
import { Loader2, Save, Building2, Camera } from 'lucide-react';

// Helper for image compression
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
        ctx?.clearRect(0, 0, width, height);
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Compression failed'));
        }, 'image/png');
      };
    };
    reader.onerror = (error) => reject(error);
  });
};

interface Props {
  company: Company;
  onCompanyUpdate?: () => void;
}

export const CompanySettingsView: React.FC<Props> = ({ company, onCompanyUpdate }) => {
  const { showToast, fetchCompanies } = useAppStore();
  const [coName, setCoName] = useState(company.name);
  const [coAddress, setCoAddress] = useState(company.address);
  const [coLogo, setCoLogo] = useState(company.logo_url || '');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company) return;

    setUploadingLogo(true);
    try {
      const compressedBlob = await compressImage(file);
      const fileName = `co-logo-${company.id}-${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from('platform')
        .upload(fileName, compressedBlob, { contentType: 'image/png', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('platform').getPublicUrl(fileName);
      setCoLogo(publicUrl);
      showToast('Logo berhasil diunggah. Klik Simpan Profil untuk menerapkan perubahan.');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Gagal upload logo', 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveCompanyProfile = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: coName,
          address: coAddress,
          logo_url: coLogo
        })
        .eq('id', company.id);

      if (error) throw error;

      await fetchCompanies();
      if (onCompanyUpdate) onCompanyUpdate();
      showToast('Profil perusahaan berhasil diperbarui secara permanen.');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl flex flex-col gap-6">
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm border border-indigo-100/50">
            <Building2 size={20} strokeWidth={2.5} />
          </div>
          <div>
            <H2 className="text-xl">Identitas Umum</H2>
            <Subtext className="text-[10px] uppercase">Workspace Setup</Subtext>
          </div>
        </div>
      </div>

      <div className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm space-y-12 flex-1">

        <div className="flex flex-col md:flex-row gap-12">
          <div className="w-full md:w-1/3 flex flex-col items-center gap-6">
            <div className="relative group">
              <div className="w-48 h-48 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden shadow-inner relative aspect-square">
                {coLogo ? (
                  <img src={coLogo} className="w-full h-full object-contain p-4" alt="Logo Preview" />
                ) : (
                  <div className="text-indigo-600  text-6xl uppercase">{coName.charAt(0)}</div>
                )}
                {uploadingLogo && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                    <Loader2 className="animate-spin text-indigo-600" size={24} />
                  </div>
                )}
              </div>
              <label className="absolute -bottom-3 -right-3 w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center cursor-pointer hover:bg-black transition-all shadow-xl active:scale-90 border-4 border-white aspect-square">
                <Camera size={20} />
                <input type="file" className="hidden" accept="image/*" onChange={handleUploadLogo} disabled={uploadingLogo} />
              </label>
            </div>
            <div className="text-center space-y-1">
              <Subtext className="text-[10px] text-gray-400 uppercase ">Logo Perusahaan</Subtext>
              <Subtext className="text-[9px] text-gray-400 italic">Gunakan file PNG/JPG transparan (Maks 1MB)</Subtext>
              {coLogo && (
                <Button variant="ghost" size="sm" onClick={() => setCoLogo('')} className="!text-[9px]  text-rose-500 uppercase hover:underline mt-2 shadow-none border-none">Hapus Logo</Button>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-8">
            <div className="space-y-2">
              <Label className="uppercase  ml-1">Nama Perusahaan Resmi</Label>
              <Input
                type="text"
                value={coName}
                onChange={(e: any) => setCoName(e.target.value)}
                className="!px-6 !py-4 !rounded-2xl !text-lg shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="uppercase  ml-1">Alamat Lengkap Kantor</Label>
              <Textarea
                value={coAddress}
                onChange={(e: any) => setCoAddress(e.target.value)}
                className="!px-6 !py-4 !rounded-2xl shadow-sm !h-32"
                placeholder="Alamat lengkap untuk korespondensi invoice..."
              />
            </div>

            <div className="pt-6 flex justify-end">
              <Button
                onClick={handleSaveCompanyProfile}
                isLoading={isProcessing}
                disabled={uploadingLogo}
                leftIcon={<Save size={18} />}
                variant='primary'
              >
                Simpan Profil Workspace
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
