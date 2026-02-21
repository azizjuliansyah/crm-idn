
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';
import { User, Mail, Phone, Camera, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  user: Profile;
  onUpdate: () => void;
}

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

export const ProfileEditView: React.FC<Props> = ({ user, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  
  const [form, setForm] = useState({
    full_name: user.full_name,
    whatsapp: user.whatsapp || '',
  });

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);
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
      setMessage({ text: "Foto profil berhasil diperbarui.", type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

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
      setMessage({ text: "Profil Anda berhasil diperbarui.", type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl animate-in fade-in duration-500">
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-10 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Profil Saya</h3>
            <p className="text-gray-400 font-medium text-sm mt-1">Kelola informasi pribadi dan foto profil Anda.</p>
          </div>
        </div>

        <div className="p-10 space-y-12">
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="relative group">
              <div className="w-32 h-32 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shadow-inner aspect-square">
                {user.avatar_url ? (
                  <img src={user.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  <div className="text-blue-600 font-bold text-4xl">{user.full_name.charAt(0)}</div>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <Loader2 className="animate-spin text-blue-600" size={24} />
                  </div>
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-gray-900 text-white rounded-lg flex items-center justify-center cursor-pointer hover:bg-black transition-all shadow-lg active:scale-90 border-2 border-white aspect-square">
                <Camera size={18} />
                <input type="file" className="hidden" accept="image/*" onChange={handleUploadAvatar} disabled={uploading} />
              </label>
            </div>
            <div className="text-center sm:text-left space-y-1">
              <h4 className="font-bold text-gray-900">Foto Profil</h4>
              <p className="text-xs text-gray-400 font-medium max-w-[200px]">Format JPG atau PNG. Akan dikompresi otomatis untuk efisiensi.</p>
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-lg flex items-center gap-3 animate-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <p className="text-xs font-bold leading-none">{message.text}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <input 
                    type="text" 
                    required
                    value={form.full_name}
                    onChange={e => setForm({...form, full_name: e.target.value})}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-gray-900 shadow-sm transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">WhatsApp</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <input 
                    type="text" 
                    value={form.whatsapp}
                    onChange={e => setForm({...form, whatsapp: e.target.value})}
                    placeholder="08123456789"
                    className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-gray-900 shadow-sm transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Alamat Email (Akun)</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input 
                  type="email" 
                  disabled
                  value={user.email}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-lg text-gray-400 font-bold shadow-none cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-gray-400 font-medium px-1">Email adalah identitas login dan tidak dapat diubah secara mandiri.</p>
            </div>

            <div className="pt-6">
              <button 
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-10 py-4 bg-gray-900 text-white rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : "Simpan Perubahan Profil"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
