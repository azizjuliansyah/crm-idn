
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, CompanyEmailSetting } from '@/lib/types';
import { Loader2, Save, Mail, Check, AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/Modal';

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

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-indigo-600 mb-4" /><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Memuat Konfigurasi Email...</p></div>;

  return (
    <div className="max-w-3xl animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="p-8 border-b border-gray-50 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Mail size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 tracking-tight">Konfigurasi Email (Mailketing)</h3>
            <p className="text-sm text-gray-400 font-medium">Hubungkan workspace Anda dengan layanan Mailketing untuk pengiriman email transaksional.</p>
          </div>
        </div>
        
        <form onSubmit={handleSave} className="p-8 space-y-6">
           <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Mailketing API Token</label>
              <input 
                type="password" 
                value={apiToken}
                onChange={e => setApiToken(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-medium outline-none focus:bg-white focus:border-indigo-500 transition-all font-mono text-sm"
                placeholder="Ex: random_token_string..."
              />
              <p className="text-[11px] text-gray-400">Dapatkan API Key di Dashboard Mailketing.</p>
           </div>

           <div className="grid grid-cols-2 gap-6">
             <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nama Pengirim (From Name)</label>
                <input 
                  type="text" 
                  value={fromName}
                  onChange={e => setFromName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-medium outline-none focus:bg-white focus:border-indigo-500 transition-all text-sm"
                  placeholder="Ex: PT Solusi Digital"
                />
             </div>
             <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Email Pengirim (Sender Email)</label>
                <input 
                  type="email" 
                  value={fromEmail}
                  onChange={e => setFromEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-medium outline-none focus:bg-white focus:border-indigo-500 transition-all text-sm"
                  placeholder="Ex: no-reply@mycompany.com"
                />
                <p className="text-[11px] text-gray-400">Pastikan domain email sudah diverifikasi di Mailketing.</p>
             </div>
           </div>

           <div className="pt-4 flex items-center gap-3">
              <button 
                type="submit" 
                disabled={isProcessing}
                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} 
                Simpan Konfigurasi
              </button>
           </div>
        </form>
      </div>

      <Modal isOpen={notification.isOpen} onClose={() => setNotification({ ...notification, isOpen: false })} title="" size="sm">
        <div className="flex flex-col items-center py-6 text-center">
           <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
               notification.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
           }`}>
               {notification.type === 'success' ? <Check size={24} /> : <AlertTriangle size={24} />}
           </div>
           <h3 className="text-lg font-bold text-gray-900 mb-2">{notification.title}</h3>
           <p className="text-sm text-gray-500 font-medium mb-6">{notification.message}</p>
           <button onClick={() => setNotification({ ...notification, isOpen: false })} className="w-full py-3 bg-gray-900 text-white font-bold text-xs uppercase rounded-lg">Tutup</button>
        </div>
      </Modal>
    </div>
  );
};
