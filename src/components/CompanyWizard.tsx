
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Building2, MapPin, Loader2, Rocket, ArrowRight, X, AlertCircle } from 'lucide-react';

interface Props {
  userId: string;
  onSuccess: () => void;
}

// Utility untuk kompresi gambar
const compressImage = (file: File, maxWidth: number = 800): Promise<Blob> => {
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

export const CompanyWizard: React.FC<Props> = ({ userId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', address: '', logo_url: '' });

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);
    try {
      const compressedBlob = await compressImage(file);
      const fileName = `co-logo-${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from('platform')
        .upload(fileName, compressedBlob, { contentType: 'image/png' });
      
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('platform').getPublicUrl(fileName);
      setForm({ ...form, logo_url: publicUrl });
    } catch (err: any) {
      setError("Gagal upload logo: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.address) return;
    
    setLoading(true);
    setError(null);

    try {
      // 1. Create Company (This triggers public.seed_new_company_settings in SQL)
      const { data: company, error: coErr } = await supabase.from('companies').insert({
        name: form.name,
        address: form.address,
        logo_url: form.logo_url || null
      }).select().single();

      if (coErr) throw coErr;
      if (!company) throw new Error("Gagal membuat data perusahaan.");

      // 2. Fetch the 'Administrator' role with retry logic to ensure trigger has finished
      let adminRole = null;
      for (let i = 0; i < 3; i++) {
        const { data } = await supabase
          .from('company_roles')
          .select('id')
          .eq('company_id', company.id)
          .eq('name', 'Administrator')
          .maybeSingle();
        
        if (data) {
          adminRole = data;
          break;
        }
        // Tunggu sebentar jika trigger database masih memproses seeding
        await new Promise(r => setTimeout(r, 500));
      }
      
      // 3. Attach current user as the first member
      // Jika adminRole tetap null, sistem tetap mengizinkan member masuk sebagai 'member' biasa tanpa role_id
      const { error: memErr } = await supabase.from('company_members').insert({
        company_id: company.id,
        user_id: userId,
        role_id: adminRole?.id || null
      });

      if (memErr) throw memErr;

      onSuccess();
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan sistem saat mendaftarkan perusahaan.");
      setLoading(false);
    }
  };

  const getInitial = (name: string) => {
    if (!name) return '?';
    return name.trim().charAt(0).toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col text-gray-900 font-inter">
      <div className="flex-1 flex flex-col md:flex-row">
        <div className="md:w-1/3 bg-blue-600 p-12 text-white flex flex-col justify-center">
          <div className="w-14 h-14 bg-white/10 rounded-lg flex items-center justify-center mb-8 backdrop-blur-md aspect-square">
            <Rocket size={28} />
          </div>
          <h1 className="text-4xl font-bold tracking-tighter leading-[1.1] mb-6">
            Satu Langkah Lagi Menuju Bisnis Pintar.
          </h1>
          <p className="text-blue-100 font-medium leading-relaxed opacity-90">
            Daftarkan identitas bisnis Anda untuk mengaktifkan seluruh fitur manajemen CRM Pintar.
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center p-8 md:p-20 overflow-y-auto bg-white">
          <form onSubmit={handleSubmit} className="max-w-md w-full space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Profil Perusahaan</h2>
              <p className="text-gray-400 font-medium text-sm">Mari buat identitas digital untuk perusahaan Anda.</p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                <p className="text-xs font-bold text-red-600 leading-relaxed">{error}</p>
              </div>
            )}

            <div className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center overflow-hidden relative aspect-square">
                  {form.logo_url ? (
                    <img src={form.logo_url} className="w-full h-full object-contain p-2" alt="Preview" />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full bg-blue-50 text-blue-600 font-bold text-2xl">
                      {form.name ? getInitial(form.name) : <Building2 className="text-gray-300" size={28} />}
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <Loader2 className="animate-spin text-blue-600" size={20} />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-900 uppercase tracking-widest">Logo (Opsional)</p>
                  <div className="flex items-center gap-2">
                    <label className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:bg-blue-100 transition-all active:scale-95">
                      Upload
                      <input type="file" className="hidden" accept="image/*" onChange={handleUploadLogo} disabled={uploading || loading} />
                    </label>
                    {form.logo_url && (
                      <button type="button" onClick={() => setForm({...form, logo_url: ''})} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Nama Perusahaan</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <input 
                    type="text" 
                    required
                    disabled={loading}
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                    placeholder="PT Teknologi Maju"
                    className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-gray-900 placeholder:text-gray-300 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Alamat Kantor</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 text-gray-300" size={18} />
                  <textarea 
                    required
                    disabled={loading}
                    value={form.address}
                    onChange={e => setForm({...form, address: e.target.value})}
                    placeholder="Alamat lengkap operasional..."
                    className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-medium h-28 resize-none text-gray-900 placeholder:text-gray-300 transition-all shadow-sm"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading || uploading}
              className="w-full py-4 bg-blue-600 text-white rounded-lg font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> Memproses...
                </>
              ) : (
                <>
                  Aktifkan Dashboard <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
