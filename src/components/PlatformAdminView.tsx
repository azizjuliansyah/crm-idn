
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile, Company, CompanyRole, PlatformSettings } from '@/lib/types';
import { 
  Plus, Building2, Users, Edit2, Trash2, Globe, CheckCircle2, 
  AlertTriangle, Loader2, X, Mail, User, ShieldCheck, Check, Search, 
  Key, Send, Info, Save, Sparkles, LayoutGrid, Monitor, ToggleLeft, ToggleRight
} from 'lucide-react';
import { Modal } from './Modal';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface Props {
  activeView: string;
  onSettingsUpdate?: () => void;
  onRefresh?: () => void;
}

const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    // Compression logic placeholder
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

export const PlatformAdminView: React.FC<Props> = ({ activeView, onSettingsUpdate, onRefresh }) => {
  // State definitions
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  
  const [isCoModalOpen, setIsCoModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '', type: 'success' as 'success' | 'error' | 'warning' });
  
  const [coForm, setCoForm] = useState({ id: null as number | null, name: '', address: '' });
  const [userForm, setFormUser] = useState({ id: '', full_name: '', email: '', whatsapp: '', password: '', platform_role: 'USER' as any });
  
  const [accessMode, setAccessMode] = useState<{ type: 'user_to_companies' | 'company_to_users', target: any }>({ type: 'user_to_companies', target: null });
  const [selectedWithRoles, setSelectedWithRoles] = useState<Record<string | number, string>>({});
  const [rolesByCompany, setRolesByCompany] = useState<Record<number, CompanyRole[]>>({});
  const [accessSearchTerm, setAccessSearchTerm] = useState('');
  
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({ 
    name: 'CRM Pintar', 
    logo_url: '',
    mailketing_api_token: '',
    mailketing_from_name: 'CRM Pintar',
    mailketing_from_email: '',
    hcaptcha_enabled: false,
    hcaptcha_site_key: ''
  });
  
  const [testRecipient, setTestRecipient] = useState('');
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: number | string, type: 'company' | 'user' } | null>(null);

  // Helper functions
  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setAlertConfig({ title, message, type });
    setIsAlertModalOpen(true);
  };

  // Data fetching
  const fetchData = async () => {
    setLoading(true);
    try {
      const [cosRes, usrsRes] = await Promise.all([
        supabase.from('companies').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false })
      ]);
      if (cosRes.data) setCompanies(cosRes.data);
      if (usrsRes.data) setUsers(usrsRes.data);
      await fetchAllRoles();
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRoles = async () => {
    const { data: allRoles } = await supabase.from('company_roles').select('*');
    if (allRoles) {
      const grouped = allRoles.reduce((acc: any, role) => {
        const coId = role.company_id;
        if (!acc[coId]) acc[coId] = [];
        acc[coId].push(role);
        return acc;
      }, {});
      setRolesByCompany(grouped);
      return grouped;
    }
    return {};
  };

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('platform_settings').select('*').eq('is_singleton', true).maybeSingle();
      if (data) setPlatformSettings({ 
        name: data.name, 
        logo_url: data.logo_url || '',
        mailketing_api_token: data.mailketing_api_token || '',
        mailketing_from_name: data.mailketing_from_name || 'CRM Pintar',
        mailketing_from_email: data.mailketing_from_email || '',
        hcaptcha_enabled: data.hcaptcha_enabled || false,
        hcaptcha_site_key: data.hcaptcha_site_key || ''
      });
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchData();
    fetchSettings();
  }, []);

  // Handlers will be injected here via replace_file_content...

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
          mailketing_api_token: platformSettings.mailketing_api_token,
          mailketing_from_name: platformSettings.mailketing_from_name,
          mailketing_from_email: platformSettings.mailketing_from_email,
        })
        .eq('is_singleton', true);

      if (error) throw error;
      showAlert('Berhasil', 'Pengaturan platform telah diperbarui secara global.');
      if (onSettingsUpdate) onSettingsUpdate();
    } catch (error: any) {
      showAlert('Gagal', error.message, 'error');
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
      showAlert('Upload Gagal', err.message, 'error');
    } finally {
      setUploading(null);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testRecipient.trim()) return;
    setIsTestingEmail(true);
    try {
      const params = new URLSearchParams();
      params.append('api_token', platformSettings.mailketing_api_token || '');
      params.append('from_name', platformSettings.mailketing_from_name || '');
      params.append('from_email', platformSettings.mailketing_from_email || '');
      params.append('recipient', testRecipient.trim());
      params.append('subject', 'Test Email - CRM Pintar Platform');
      params.append('content', '<h1>Koneksi Berhasil</h1><p>Ini adalah email uji coba dari sistem pusat.</p>');

      const res = await fetch("https://api.mailketing.co.id/api/v1/send", {
        method: "POST",
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });
      
      const result = await res.json();
      if (result.status === 'success') {
        showAlert('Berhasil', 'Email uji coba telah dikirim. Periksa inbox/spam email penerima.');
      } else {
        throw new Error(result.message || 'Gagal mengirim email.');
      }
    } catch (err: any) {
      showAlert('Error API', err.message, 'error');
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coForm.name) return;
    setIsProcessing(true);
    try {
      if (coForm.id) {
        await supabase.from('companies').update({ name: coForm.name, address: coForm.address }).eq('id', coForm.id);
      } else {
        const { data: newCo, error: coErr } = await supabase.from('companies').insert({ 
            name: coForm.name, 
            address: coForm.address 
        }).select().single();

        if (coErr) throw coErr;

        const { data: { user } } = await supabase.auth.getUser();
        if (user && newCo) {
            await new Promise(r => setTimeout(r, 800));
            const { data: adminRole } = await supabase
                .from('company_roles')
                .select('id')
                .eq('company_id', newCo.id)
                .eq('name', 'Administrator')
                .maybeSingle();

            await supabase.from('company_members').insert({
                company_id: newCo.id,
                user_id: user.id,
                role_id: adminRole?.id || null
            });
        }
      }
      setIsCoModalOpen(false); 
      fetchData(); 
      if (onRefresh) onRefresh();
      showAlert('Berhasil', 'Workspace berhasil dibuat dan data default telah disiapkan.');
    } catch (error: any) { 
        showAlert('Gagal', error.message, 'error'); 
    } finally { 
        setIsProcessing(false); 
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.full_name || !userForm.email) return;
    setIsProcessing(true);
    try {
      if (userForm.id) {
        await supabase.from('profiles').update({ 
          full_name: userForm.full_name, 
          whatsapp: userForm.whatsapp, 
          platform_role: userForm.platform_role 
        }).eq('id', userForm.id);
      } else {
        const tempClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
        const { error: signUpError } = await (tempClient.auth as any).signUp({ 
          email: userForm.email, 
          password: userForm.password || 'CrmPintar2025!',
          options: { data: { full_name: userForm.full_name, whatsapp: userForm.whatsapp, platform_role: userForm.platform_role } } 
        });
        if (signUpError) throw signUpError;
      }
      setIsUserModalOpen(false); 
      fetchData();
    } catch (err: any) { showAlert('Gagal', err.message, 'error'); } finally { setIsProcessing(false); }
  };

  const openAccessModal = async (target: any, type: 'user_to_companies' | 'company_to_users') => {
    setAccessMode({ type, target });
    setSelectedWithRoles({});
    setAccessSearchTerm('');
    setIsProcessing(true);
    try {
      const currentRolesGrouped = await fetchAllRoles(); 
      const query = supabase.from('company_members').select('company_id, user_id, role_id');
      if (type === 'user_to_companies') query.eq('user_id', target.id);
      else query.eq('company_id', target.id);
      const { data } = await query;
      if (data) {
        const mapping: Record<string | number, string> = {};
        data.forEach(d => {
          const id = type === 'user_to_companies' ? d.company_id : d.user_id;
          const companyId = type === 'user_to_companies' ? d.company_id : target.id;
          mapping[id] = d.role_id || (currentRolesGrouped[companyId]?.[0]?.id || '');
        });
        setSelectedWithRoles(mapping);
      }
      setIsAccessModalOpen(true);
    } finally { setIsProcessing(false); }
  };

  const handleToggleAccessWithRole = (id: string | number, roleId?: string) => {
    setSelectedWithRoles(prev => {
      const next = { ...prev };
      if (roleId === undefined) delete next[id];
      else next[id] = roleId;
      return next;
    });
  };

  const saveAccess = async () => {
    setIsProcessing(true);
    const target = accessMode.target;
    try {
      if (accessMode.type === 'user_to_companies') {
        await supabase.from('company_members').delete().eq('user_id', target.id);
        const inserts = Object.entries(selectedWithRoles).map(([coId, roleId]) => ({ user_id: target.id, company_id: parseInt(coId), role_id: roleId }));
        if (inserts.length > 0) await supabase.from('company_members').insert(inserts);
      } else {
        await supabase.from('company_members').delete().eq('company_id', target.id);
        const inserts = Object.entries(selectedWithRoles).map(([userId, roleId]) => ({ company_id: target.id, user_id: userId, role_id: roleId }));
        if (inserts.length > 0) await supabase.from('company_members').insert(inserts);
      }
      setIsAccessModalOpen(false);
      fetchData();
    } catch (err: any) { showAlert('Gagal', err.message, 'error'); } finally { setIsProcessing(false); }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setIsProcessing(true);
    try {
      await supabase.from(pendingDelete.type === 'company' ? 'companies' : 'profiles').delete().eq('id', pendingDelete.id);
      fetchData(); 
      if (onRefresh) onRefresh();
    } catch (error: any) { showAlert('Gagal', error.message, 'error'); } finally { setIsConfirmModalOpen(false); setPendingDelete(null); setIsProcessing(false); }
  };


  if (loading) return <div className="flex flex-col items-center justify-center h-64 bg-white"><Loader2 className="animate-spin text-blue-600" /></div>;

  const filteredItems = accessMode.type === 'user_to_companies' 
    ? companies.filter(co => String(co.id).includes(accessSearchTerm) || co.name.toLowerCase().includes(accessSearchTerm.toLowerCase())).sort((a, b) => a.id - b.id)
    : users.filter(u => u.full_name.toLowerCase().includes(accessSearchTerm.toLowerCase()) || u.email.toLowerCase().includes(accessSearchTerm.toLowerCase()));

  return (
    <div className="animate-in fade-in duration-500">

      {activeView === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-8 bg-white rounded-2xl border border-gray-100 shadow-sm"><Building2 size={24} className="text-blue-600 mb-6" /><p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Total Workspace</p><h3 className="text-4xl font-bold">{companies.length}</h3></div>
          <div className="p-8 bg-white rounded-2xl border border-gray-100 shadow-sm"><Users size={24} className="text-emerald-600 mb-6" /><p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Total Pengguna</p><h3 className="text-4xl font-bold">{users.length}</h3></div>
        </div>
      )}

      {activeView === 'perusahaan' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="p-8 flex items-center justify-between border-b border-gray-50"><h3 className="text-lg font-bold uppercase tracking-tight">Master Workspace</h3><button onClick={() => { setCoForm({ id: null, name: '', address: '' }); setIsCoModalOpen(true); }} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Plus size={16} /> Tambah</button></div>
          <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-gray-50/50"><th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Workspace</th><th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Akses</th><th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Aksi</th></tr></thead><tbody className="divide-y divide-gray-50">{companies.map(co => (<tr key={co.id} className="hover:bg-gray-50/30 group"><td className="px-8 py-6 flex items-center gap-4"><div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">{co.logo_url ? <img src={co.logo_url} className="w-full h-full object-contain" /> : <Building2 size={20} />}</div><div><p className="font-bold">{co.name}</p><p className="text-[10px] font-mono text-gray-400">ID: {String(co.id).padStart(5, '0')}</p></div></td><td className="px-8 py-6 text-center"><button onClick={() => openAccessModal(co, 'company_to_users')} className="px-4 py-2 bg-blue-50 text-[10px] font-bold text-blue-600 uppercase rounded-lg border border-blue-100 hover:bg-blue-600 hover:text-white transition-all">Atur Anggota</button></td><td className="px-8 py-6 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => { setCoForm({ id: co.id, name: co.name, address: co.address }); setIsCoModalOpen(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16} /></button><button onClick={() => { setPendingDelete({ id: co.id, type: 'company' }); setIsConfirmModalOpen(true); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button></td></tr>))}</tbody></table></div>
        </div>
      )}

      {activeView === 'pengguna' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="p-8 flex items-center justify-between border-b border-gray-50"><h3 className="text-lg font-bold uppercase tracking-tight">Data Pengguna</h3><button onClick={() => { setFormUser({ id: '', full_name: '', email: '', whatsapp: '', password: '', platform_role: 'USER' }); setIsUserModalOpen(true); }} className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Plus size={16} /> Buat User</button></div>
          <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-gray-50/50"><th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">User & Email</th><th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Role Platform</th><th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Workspace</th><th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Aksi</th></tr></thead><tbody className="divide-y divide-gray-50">{users.map(u => (<tr key={u.id} className="hover:bg-gray-50/30 group"><td className="px-8 py-6 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-bold uppercase">{u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover rounded-lg" /> : u.full_name.charAt(0)}</div><div><p className="font-bold">{u.full_name}</p><p className="text-xs text-gray-400">{u.email}</p></div></td><td className="px-8 py-6"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${u.platform_role === 'ADMIN' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-500'}`}>{u.platform_role}</span></td><td className="px-8 py-6 text-center"><button onClick={() => openAccessModal(u, 'user_to_companies')} className="px-4 py-2 bg-emerald-50 text-[10px] font-bold text-emerald-600 uppercase rounded-lg border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all">Workspace</button></td><td className="px-8 py-6 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => { setFormUser({ id: u.id, full_name: u.full_name, email: u.email, whatsapp: u.whatsapp || '', password: '', platform_role: u.platform_role }); setIsUserModalOpen(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16} /></button><button onClick={() => { setPendingDelete({ id: u.id, type: 'user' }); setIsConfirmModalOpen(true); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button></td></tr>))}</tbody></table></div>
        </div>
      )}

      {activeView === 'pengaturan' && (
        <div className="max-w-4xl space-y-8">
           <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-10">
              <div className="flex items-center gap-6 mb-10 pb-6 border-b border-gray-50">
                 <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
                    <Monitor size={32} />
                 </div>
                 <div>
                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Identitas Platform</h3>
                    <p className="text-sm text-gray-400 font-medium">Atur nama dan logo sistem yang muncul di halaman login.</p>
                 </div>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-10">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nama Aplikasi Platform</label>
                          <input 
                             type="text" 
                             value={platformSettings.name}
                             onChange={e => setPlatformSettings({...platformSettings, name: e.target.value})}
                             className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner"
                          />
                       </div>

                       <div className="space-y-4">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Logo Platform</p>
                          <div className="flex items-center gap-4">
                             <div className="w-24 h-24 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center overflow-hidden relative shadow-inner">
                                {platformSettings.logo_url ? <img src={platformSettings.logo_url} className="w-full h-full object-contain p-2" /> : <LayoutGrid size={24} className="text-gray-200" />}
                                {uploading === 'logo_url' && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={16} /></div>}
                             </div>
                             <div className="flex flex-col gap-2">
                                <label className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:bg-blue-100 transition-all">
                                   Ganti Logo
                                   <input type="file" className="hidden" accept="image/*" onChange={handleUploadLogo} disabled={!!uploading} />
                                </label>
                                {platformSettings.logo_url && <button type="button" onClick={() => setPlatformSettings({...platformSettings, logo_url: ''})} className="text-[9px] font-bold text-rose-500 uppercase tracking-widest hover:underline">Hapus Logo</button>}
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-6">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                <ShieldCheck size={18} className="text-indigo-600" />
                                <h4 className="text-[11px] font-bold uppercase tracking-widest text-indigo-900">Keamanan hCaptcha</h4>
                             </div>
                             <button 
                                type="button"
                                onClick={() => setPlatformSettings({...platformSettings, hcaptcha_enabled: !platformSettings.hcaptcha_enabled})}
                                className={`transition-all ${platformSettings.hcaptcha_enabled ? 'text-indigo-600' : 'text-gray-300'}`}
                             >
                                {platformSettings.hcaptcha_enabled ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                             </button>
                          </div>
                          
                          <div className="space-y-2">
                             <label className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest ml-1">hCaptcha Site Key</label>
                             <input 
                                type="text" 
                                value={platformSettings.hcaptcha_site_key || ''}
                                onChange={e => setPlatformSettings({...platformSettings, hcaptcha_site_key: e.target.value})}
                                disabled={!platformSettings.hcaptcha_enabled}
                                className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl font-mono text-xs outline-none focus:border-indigo-500 disabled:opacity-30 transition-all"
                                placeholder="Pasted your site key here..."
                             />
                          </div>

                          <div className="flex gap-3">
                             <Info size={14} className="text-indigo-400 shrink-0" />
                             <p className="text-[9px] text-indigo-600 leading-relaxed italic">Aktifkan perlindungan hCaptcha pada halaman login untuk mencegah serangan brute force bot.</p>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="flex justify-end pt-8 border-t border-gray-50">
                    <button 
                       type="submit" 
                       disabled={isProcessing}
                       className="px-10 py-4 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl hover:bg-black active:scale-95 transition-all flex items-center gap-3"
                    >
                       {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                       Simpan Pengaturan Platform
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {activeView === 'pengaturan_email' && (
        <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-10">
             <div className="flex items-center gap-6 mb-10 pb-6 border-b border-gray-50">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                   <Mail size={32} />
                </div>
                <div>
                   <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Global Email Relay (Mailketing)</h3>
                   <p className="text-sm text-gray-400 font-medium leading-relaxed">Konfigurasi email sistem utama untuk pengiriman notifikasi, reset password, dan undangan anggota baru.</p>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <form onSubmit={handleSaveSettings} className="space-y-8">
                   <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                         <Key size={16} className="text-indigo-600" />
                         <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Global API Token</label>
                      </div>
                      <input 
                        type="password" 
                        value={platformSettings.mailketing_api_token || ''}
                        onChange={e => setPlatformSettings({...platformSettings, mailketing_api_token: e.target.value})}
                        placeholder="Platform Mailketing API Token..."
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-mono text-sm outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-inner"
                      />
                   </div>

                   <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                         <User size={16} className="text-indigo-600" />
                         <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Global Sender Name</label>
                      </div>
                      <input 
                        type="text" 
                        value={platformSettings.mailketing_from_name || ''}
                        onChange={e => setPlatformSettings({...platformSettings, mailketing_from_name: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-inner"
                      />
                   </div>

                   <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                         <Globe size={16} className="text-indigo-600" />
                         <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Global Sender Email</label>
                      </div>
                      <input 
                        type="email" 
                        value={platformSettings.mailketing_from_email || ''}
                        onChange={e => setPlatformSettings({...platformSettings, mailketing_from_email: e.target.value})}
                        placeholder="system@yourdomain.com"
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-inner"
                      />
                   </div>

                   <button 
                      type="submit" 
                      disabled={isProcessing}
                      className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3"
                   >
                     {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                     Simpan Pengaturan Email
                   </button>
                </form>

                <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 space-y-8 flex flex-col">
                   <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-6">
                         <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-gray-100">
                            <Send size={18} />
                         </div>
                         <h4 className="font-bold text-gray-900 uppercase text-xs tracking-widest">Uji Coba Pengiriman</h4>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Penerima Test</label>
                        <input 
                          type="email" 
                          value={testRecipient}
                          onChange={e => setTestRecipient(e.target.value)}
                          placeholder="tujuan@email.com"
                          className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 transition-all shadow-sm"
                        />
                      </div>
                   </div>

                   <div className="flex-1 flex flex-col justify-end gap-4">
                      <div className="p-4 bg-white/50 rounded-xl flex gap-3 border border-gray-200">
                         <Info size={16} className="text-blue-500 shrink-0" />
                         <p className="text-[10px] text-gray-500 leading-relaxed italic">Gunakan fitur ini untuk memastikan Platform Global Email Relay terhubung dengan benar ke server Mailketing.</p>
                      </div>
                      <button 
                        onClick={handleSendTestEmail} 
                        disabled={isTestingEmail || !testRecipient} 
                        className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-30"
                      >
                        {isTestingEmail ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                        Kirim Email Uji Coba
                      </button>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      <Modal isOpen={isCoModalOpen} onClose={() => setIsCoModalOpen(false)} title={coForm.id ? "Edit Workspace" : "Tambah Workspace"}>
        <div className="space-y-6">
           <div className="space-y-2"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nama Workspace</label><input type="text" value={coForm.name} onChange={e => setCoForm({...coForm, name: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none" /></div>
           <div className="space-y-2"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Alamat</label><textarea value={coForm.address} onChange={e => setCoForm({...coForm, address: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl font-medium text-sm h-24 outline-none resize-none" /></div>
           <button onClick={handleSaveCompany} disabled={isProcessing} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
             {isProcessing ? <Loader2 className="animate-spin" size={16} /> : null} Simpan Workspace
           </button>
        </div>
      </Modal>

      <Modal isOpen={isAlertModalOpen} onClose={() => setIsAlertModalOpen(false)} title={alertConfig.title} size="sm">
        <div className="flex flex-col items-center py-6 text-center space-y-4">
           <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${alertConfig.type === 'error' ? 'bg-red-50 text-red-500' : alertConfig.type === 'warning' ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-600'}`}>{alertConfig.type === 'error' ? <X size={32} /> : alertConfig.type === 'warning' ? <AlertTriangle size={32} /> : <CheckCircle2 size={32} />}</div>
           <p className="text-sm text-gray-600 font-medium px-6">{alertConfig.message}</p>
           <button onClick={() => setIsAlertModalOpen(false)} className="w-full max-w-[200px] py-4 bg-gray-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest">Tutup</button>
        </div>
      </Modal>
      
      {/* ACCESS MODAL */}
      <Modal 
        isOpen={isAccessModalOpen} 
        onClose={() => setIsAccessModalOpen(false)} 
        title={accessMode.type === 'user_to_companies' ? `Kelola Workspace: ${accessMode.target?.full_name}` : `Kelola Anggota: ${accessMode.target?.name}`}
        size="lg"
        footer={<button onClick={saveAccess} disabled={isProcessing} className="px-10 py-4 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl flex items-center gap-2">{isProcessing && <Loader2 className="animate-spin" size={14} />} Simpan Akses</button>}
      >
        <div className="space-y-6">
           <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
              <input type="text" placeholder="Cari..." value={accessSearchTerm} onChange={e => setAccessSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold" />
           </div>
           <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
              {filteredItems.map(item => {
                 const isSelected = !!selectedWithRoles[item.id];
                 const itemCoId = accessMode.type === 'user_to_companies' ? item.id : accessMode.target.id;
                 const roles = rolesByCompany[itemCoId] || [];
                 
                 return (
                    <div key={item.id} className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${isSelected ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-gray-100'}`}>
                       <div className="flex items-center gap-4">
                          <button onClick={() => isSelected ? handleToggleAccessWithRole(item.id) : handleToggleAccessWithRole(item.id, roles[0]?.id || '')} className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white border-gray-200 text-transparent'}`}><Check size={14} strokeWidth={4} /></button>
                          <div>
                             <p className="text-[13px] font-bold text-gray-900">{accessMode.type === 'user_to_companies' ? (item as any).name : (item as any).full_name}</p>
                             <p className="text-[10px] text-gray-400 font-bold uppercase">{accessMode.type === 'user_to_companies' ? `ID: ${item.id}` : (item as any).email}</p>
                          </div>
                       </div>
                       {isSelected && roles.length > 0 && (
                          <select 
                             value={selectedWithRoles[item.id]} 
                             onChange={e => handleToggleAccessWithRole(item.id, e.target.value)}
                             className="bg-white border border-blue-100 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase text-blue-600 outline-none shadow-sm"
                          >
                             {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                       )}
                    </div>
                 );
              })}
           </div>
        </div>
      </Modal>

      {/* CONFIRM DELETE MODAL */}
      <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Konfirmasi Hapus" size="sm">
        <div className="flex flex-col items-center py-6 text-center space-y-6">
           <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center"><AlertTriangle size={32} /></div>
           <p className="text-sm font-bold text-gray-600 px-4 leading-relaxed">Tindakan ini permanen. Seluruh data yang terhubung dengan entitas ini akan ikut terhapus atau kehilangan referensi.</p>
           <div className="flex w-full gap-3">
              <button onClick={() => setIsConfirmModalOpen(false)} className="flex-1 py-4 bg-gray-100 text-gray-400 font-bold text-[10px] uppercase rounded-xl">Batal</button>
              <button onClick={confirmDelete} disabled={isProcessing} className="flex-1 py-4 bg-rose-600 text-white font-bold text-[10px] uppercase rounded-xl shadow-lg shadow-rose-100 flex items-center justify-center gap-2">
                 {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />} Ya, Hapus
              </button>
           </div>
        </div>
      </Modal>

      {/* USER EDITOR MODAL */}
      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title={userForm.id ? "Edit User" : "Buat User Baru"}>
        <div className="space-y-6">
           <div className="space-y-2"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nama Lengkap</label><input type="text" value={userForm.full_name} onChange={e => setFormUser({...userForm, full_name: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none" /></div>
           <div className="space-y-2"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Alamat Email</label><input type="email" value={userForm.email} onChange={e => setFormUser({...userForm, email: e.target.value})} disabled={!!userForm.id} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none disabled:opacity-50" /></div>
           <div className="space-y-2"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">WhatsApp</label><input type="text" value={userForm.whatsapp} onChange={e => setFormUser({...userForm, whatsapp: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none" /></div>
           {!userForm.id && (
             <div className="space-y-2"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label><input type="password" value={userForm.password} onChange={e => setFormUser({...userForm, password: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none" placeholder="Minimal 6 karakter..." /></div>
           )}
           <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Role Platform</label>
              <select value={userForm.platform_role} onChange={e => setFormUser({...userForm, platform_role: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none cursor-pointer">
                 <option value="USER">USER (Standard)</option>
                 <option value="ADMIN">ADMIN (Super Admin)</option>
              </select>
           </div>
           <button onClick={handleSaveUser} disabled={isProcessing} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
             {isProcessing ? <Loader2 className="animate-spin" size={16} /> : null} Simpan Data User
           </button>
        </div>
      </Modal>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
      


    </div>
  );
};
