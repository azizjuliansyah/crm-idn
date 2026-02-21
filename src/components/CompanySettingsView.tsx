
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, CompanyMember, CompanyRole, Profile } from '@/lib/types';
import { ShieldAlert, TrendingUp, Trash2, Edit2, Loader2, AlertTriangle, CheckCircle2, ShieldCheck, Mail, Save, X, Plus, Upload, Building2, Camera, UserPlus } from 'lucide-react';
import { Modal } from './Modal';

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
  const [coName, setCoName] = useState(company.name);
  const [coAddress, setCoAddress] = useState(company.address);
  const [coLogo, setCoLogo] = useState(company.logo_url || '');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [alert, setAlert] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' }>({ isOpen: false, title: '', message: '', type: 'success' });

  const showAlert = (title: string, message: string, type: 'success' | 'error') => {
    setAlert({ isOpen: true, title, message, type });
  };

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
      showAlert('Berhasil', 'Logo berhasil diunggah. Klik Simpan Profil untuk menerapkan perubahan.', 'success');
    } catch (err: any) {
      console.error(err);
      showAlert('Gagal', err.message || 'Gagal upload logo', 'error');
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
      
      if (onCompanyUpdate) onCompanyUpdate();
      showAlert('Tersimpan', 'Profil perusahaan berhasil diperbarui secara permanen.', 'success');
    } catch (err: any) {
      showAlert('Kesalahan', err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl bg-white p-10 rounded-2xl border border-gray-100 shadow-sm space-y-12 animate-in fade-in duration-500">
        <div className="flex items-center gap-6 pb-6 border-b border-gray-50">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
                <Building2 size={32} />
            </div>
            <div>
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight uppercase">Identitas Workspace</h3>
                <p className="text-sm text-gray-400 font-medium">Informasi ini akan muncul pada dokumen penawaran dan invoice Anda.</p>
            </div>
        </div>

        <div className="flex flex-col md:flex-row gap-12">
            <div className="w-full md:w-1/3 flex flex-col items-center gap-6">
                <div className="relative group">
                <div className="w-48 h-48 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden shadow-inner relative aspect-square">
                    {coLogo ? (
                        <img src={coLogo} className="w-full h-full object-contain p-4" alt="Logo Preview" />
                    ) : (
                        <div className="text-blue-600 font-bold text-6xl uppercase">{coName.charAt(0)}</div>
                    )}
                    {uploadingLogo && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                            <Loader2 className="animate-spin text-blue-600" size={24} />
                        </div>
                    )}
                </div>
                <label className="absolute -bottom-3 -right-3 w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center cursor-pointer hover:bg-black transition-all shadow-xl active:scale-90 border-4 border-white aspect-square">
                    <Camera size={20} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleUploadLogo} disabled={uploadingLogo} />
                </label>
                </div>
                <div className="text-center space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Logo Perusahaan</p>
                    <p className="text-[9px] text-gray-400 italic">Gunakan file PNG/JPG transparan (Maks 1MB)</p>
                    {coLogo && (
                    <button onClick={() => setCoLogo('')} className="text-[9px] font-bold text-rose-500 uppercase hover:underline mt-2">Hapus Logo</button>
                    )}
                </div>
            </div>

            <div className="flex-1 space-y-8">
                <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Nama Perusahaan Resmi</label>
                <input 
                    type="text" 
                    value={coName} 
                    onChange={e => setCoName(e.target.value)} 
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-lg outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm" 
                />
                </div>
                
                <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Alamat Lengkap Kantor</label>
                <textarea 
                    value={coAddress} 
                    onChange={e => setCoAddress(e.target.value)} 
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-medium h-32 resize-none outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm"
                    placeholder="Alamat lengkap untuk korespondensi invoice..." 
                />
                </div>

                <div className="pt-6 flex justify-end">
                <button 
                    onClick={handleSaveCompanyProfile} 
                    disabled={isProcessing || uploadingLogo} 
                    className="px-12 py-5 bg-blue-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-3"
                >
                    {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} 
                    Simpan Profil Workspace
                </button>
                </div>
            </div>
        </div>

        <Modal isOpen={alert.isOpen} onClose={() => setAlert({ ...alert, isOpen: false })} title={alert.title} size="sm">
            <div className="flex flex-col items-center py-6 text-center space-y-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${alert.type === 'error' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
                {alert.type === 'error' ? <X size={32} /> : <CheckCircle2 size={32} />}
            </div>
            <p className="text-sm text-gray-600 font-medium px-6">{alert.message}</p>
            <button onClick={() => setAlert({ ...alert, isOpen: false })} className="w-full max-w-[200px] py-4 bg-gray-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest">Tutup</button>
            </div>
        </Modal>
    </div>
  );
};
