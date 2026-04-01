'use client';

import React, { useState } from 'react';
import { Input, Button, H3, Subtext, Label, Avatar, Card } from '@/components/ui';
import { useAppStore } from '@/lib/store/useAppStore';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';
import { User, Mail, Phone, Camera, Loader2 } from 'lucide-react';

// Utility untuk kompresi gambar
const compressImage = (file: File, maxWidth: number = 600, quality: number = 0.8): Promise<Blob> => {
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
  user: Profile;
  onUpdate: () => void;
}

export const ProfileEditView: React.FC<Props> = ({ user, onUpdate }) => {
  const { showToast } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    full_name: user.full_name,
    whatsapp: user.whatsapp || '',
  });

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Kompresi sebelum upload
      const compressedBlob = await compressImage(file);
      const fileName = `avatar-${user.id}-${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from('platform')
        .upload(fileName, compressedBlob, { contentType: 'image/png' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('platform').getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      onUpdate();
      showToast("Foto profil berhasil diperbarui.", 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name,
          whatsapp: form.whatsapp
        })
        .eq('id', user.id);

      if (error) throw error;

      onUpdate();
      showToast("Profil Anda berhasil diperbarui.", 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <Card
        title={
          <div>
            <H3 className="text-2xl normal-case">Profil Saya</H3>
            <Subtext>Kelola informasi pribadi dan foto profil Anda.</Subtext>
          </div>
        }
      >
        <div className="p-10 space-y-12">
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="relative group">
              <Avatar
                src={user.avatar_url || ''}
                name={user.full_name}
                size="xl"
                shape="square"
                className="w-32 h-32 text-4xl shadow-inner border-gray-100"
              />
              {uploading && (
                <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center z-10">
                  <Loader2 className="animate-spin text-blue-600" size={24} />
                </div>
              )}
              <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-gray-900 text-white rounded-lg flex items-center justify-center cursor-pointer hover:bg-black transition-all shadow-lg active:scale-90 border-2 border-white aspect-square z-20">
                <Camera size={18} />
                <input type="file" className="hidden" accept="image/*" onChange={handleUploadAvatar} disabled={uploading} />
              </label>
            </div>
            <div className="text-center sm:text-left space-y-1">
              <Label className="text-gray-900 normal-case text-sm">Foto Profil</Label>
              <Subtext className="text-xs max-w-[200px]">Format JPG atau PNG. Akan dikompresi otomatis untuk efisiensi.</Subtext>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Nama Lengkap"
                type="text"
                required
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                leftIcon={<User size={18} />}
              />
              <Input
                label="WhatsApp"
                type="text"
                value={form.whatsapp}
                onChange={e => setForm({ ...form, whatsapp: e.target.value })}
                placeholder="08123456789"
                leftIcon={<Phone size={18} />}
              />
            </div>

            <div className="space-y-2">
              <Input
                label="Alamat Email (Akun)"
                type="email"
                disabled
                value={user.email}
                leftIcon={<Mail size={18} />}
              />
              <Subtext className="text-[10px] px-1">Email adalah identitas login dan tidak dapat diubah secara mandiri.</Subtext>
            </div>

            <div className="pt-6">
              <Button
                type="submit"
                isLoading={loading}
                variant="primary"
              >
                Simpan Perubahan Profil
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};
