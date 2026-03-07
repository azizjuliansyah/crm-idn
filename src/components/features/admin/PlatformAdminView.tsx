import React, { useState, useEffect } from 'react';
import { Input, Button, Table, TableHeader, TableBody, TableRow, TableCell, H1, H3, Subtext, Label, Avatar, Badge, Card, Toast, ToastType } from '@/components/ui';

import { supabase } from '@/lib/supabase';
import { Profile, Company, CompanyRole, PlatformSettings } from '@/lib/types';
import {
  Plus, Building2, Users, Edit2, Trash2, Globe, CheckCircle2,
  AlertTriangle, Loader2, X, Mail, User, ShieldCheck, Check, Search,
  Key, Send, Info, Save, Sparkles, LayoutGrid, Monitor, ToggleLeft, ToggleRight
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

import { PlatformWorkspaceFormModal } from './components/PlatformWorkspaceFormModal';
import { PlatformUserFormModal } from './components/PlatformUserFormModal';
import { PlatformAccessModal } from './components/PlatformAccessModal';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
// Removed legacy NotificationModal import

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
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
    isOpen: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ isOpen: true, message, type });
  };

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
  // const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' = 'success') => {
  //   setAlertConfig({ title, message, type });
  //   setIsAlertModalOpen(true);
  // };

  // Data fetching
  const fetchData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [cosRes, usrsRes] = await Promise.all([
        supabase.from('companies').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false })
      ]);
      if (cosRes.data) setCompanies(cosRes.data);
      if (usrsRes.data) setUsers(usrsRes.data);
      await fetchAllRoles();
    } finally {
      if (isInitial) setLoading(false);
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
    fetchData(true);
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
      showToast('Pengaturan platform telah diperbarui secara global.');
      if (onSettingsUpdate) onSettingsUpdate();
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
      params.append('content', '<H1>Koneksi Berhasil</H1><Subtext>Ini adalah email uji coba dari sistem pusat.</Subtext>');

      const res = await fetch("https://api.mailketing.co.id/api/v1/send", {
        method: "POST",
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });

      const result = await res.json();
      if (result.status === 'success') {
        showToast('Email uji coba telah dikirim. Periksa inbox/spam email penerima.');
      } else {
        throw new Error(result.message || 'Gagal mengirim email.');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
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
      showToast('Workspace berhasil dibuat dan data default telah disiapkan.');
    } catch (error: any) {
      showToast(error.message, 'error');
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
    } catch (err: any) { showToast(err.message, 'error'); } finally { setIsProcessing(false); }
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
    } catch (err: any) { showToast(err.message, 'error'); } finally { setIsProcessing(false); }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setIsProcessing(true);
    try {
      await supabase.from(pendingDelete.type === 'company' ? 'companies' : 'profiles').delete().eq('id', pendingDelete.id);
      fetchData();
      if (onRefresh) onRefresh();
    } catch (error: any) { showToast(error.message, 'error'); } finally { setIsConfirmModalOpen(false); setPendingDelete(null); setIsProcessing(false); }
  };


  if (loading) return <Card className="flex flex-col items-center justify-center h-64"><Loader2 className="animate-spin text-blue-600" /></Card>;

  const filteredItems = accessMode.type === 'user_to_companies'
    ? companies.filter(co => String(co.id).includes(accessSearchTerm) || co.name.toLowerCase().includes(accessSearchTerm.toLowerCase())).sort((a, b) => a.id - b.id)
    : users.filter(u => u.full_name.toLowerCase().includes(accessSearchTerm.toLowerCase()) || u.email.toLowerCase().includes(accessSearchTerm.toLowerCase()));

  return (
    <div>

      {activeView === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card contentClassName="p-8">
            <Building2 size={24} className="text-blue-600 mb-6" />
            <Label className="mb-1 block">Total Workspace</Label>
            <H3 className="text-4xl ">{companies.length}</H3>
          </Card>
          <Card contentClassName="p-8">
            <Users size={24} className="text-emerald-600 mb-6" />
            <Label className="mb-1 block">Total Pengguna</Label>
            <H3 className="text-4xl ">{users.length}</H3>
          </Card>
        </div>
      )}

      {activeView === 'perusahaan' && (
        <Card
          title="Master Workspace"
          action={
            <Button
              onClick={() => { setCoForm({ id: null, name: '', address: '' }); setIsCoModalOpen(true); }}
              size="sm"
              leftIcon={<Plus size={16} />}
            >
              Tambah
            </Button>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader>Workspace</TableCell>
                <TableCell isHeader className="text-center">Akses</TableCell>
                <TableCell isHeader className="text-center">Aksi</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map(co => (
                <TableRow key={co.id}>
                  <TableCell className="flex items-center gap-4">
                    <Avatar src={co.logo_url || ''} name={co.name} shape="square" size="lg" />
                    <div>
                      <Subtext className="">{co.name}</Subtext>
                      <Subtext className="text-[10px] font-mono text-gray-400">ID: {String(co.id).padStart(5, '0')}</Subtext>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      onClick={() => openAccessModal(co, 'company_to_users')}
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white"
                    >
                      Atur Anggota
                    </Button>
                  </TableCell>
                  <TableCell className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2 text-blue-500"
                      onClick={() => { setCoForm({ id: co.id, name: co.name, address: co.address }); setIsCoModalOpen(true); }}
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2 text-red-500"
                      onClick={() => { setPendingDelete({ id: co.id, type: 'company' }); setIsConfirmModalOpen(true); }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {activeView === 'pengguna' && (
        <Card
          title="Data Pengguna"
          action={
            <Button
              onClick={() => { setFormUser({ id: '', full_name: '', email: '', whatsapp: '', password: '', platform_role: 'USER' }); setIsUserModalOpen(true); }}
              variant="success"
              size="sm"
              leftIcon={<Plus size={16} />}
            >
              Buat User
            </Button>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader>User & Email</TableCell>
                <TableCell isHeader>Role Platform</TableCell>
                <TableCell isHeader className="text-center">Workspace</TableCell>
                <TableCell isHeader className="text-center">Aksi</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="flex items-center gap-3">
                    <Avatar src={u.avatar_url || ''} name={u.full_name} shape="square" size="lg" />
                    <div>
                      <Subtext className="">{u.full_name}</Subtext>
                      <Subtext className="text-xs">{u.email}</Subtext>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.platform_role === 'ADMIN' ? 'secondary' : 'neutral'}>
                      {u.platform_role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      onClick={() => openAccessModal(u, 'user_to_companies')}
                      variant="ghost"
                      size="sm"
                      className="text-emerald-600 border border-emerald-100 hover:bg-emerald-600 hover:text-white"
                    >
                      Workspace
                    </Button>
                  </TableCell>
                  <TableCell className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2 text-blue-500"
                      onClick={() => { setFormUser({ id: u.id, full_name: u.full_name, email: u.email, whatsapp: u.whatsapp || '', password: '', platform_role: u.platform_role }); setIsUserModalOpen(true); }}
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2 text-red-500"
                      onClick={() => { setPendingDelete({ id: u.id, type: 'user' }); setIsConfirmModalOpen(true); }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {activeView === 'pengaturan' && (
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
                      <Button
                        type="button"
                        onClick={() => setPlatformSettings({ ...platformSettings, hcaptcha_enabled: !platformSettings.hcaptcha_enabled })}
                        className={`transition-all ${platformSettings.hcaptcha_enabled ? 'text-indigo-600' : 'text-gray-300'}`}
                      >
                        {platformSettings.hcaptcha_enabled ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                      </Button>
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
        </div>
      )}

      {activeView === 'pengaturan_email' && (
        <div className="max-w-4xl space-y-8">
          <Card
            contentClassName="p-10"
            title={
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                  <Mail size={32} />
                </div>
                <div>
                  <H3 className="text-2xl text-gray-900">Global Email Relay (Mailketing)</H3>
                  <Subtext>Konfigurasi email sistem utama untuk pengiriman notifikasi, reset password, dan undangan anggota baru.</Subtext>
                </div>
              </div>
            }
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <form onSubmit={handleSaveSettings} className="space-y-8">
                <Input
                  label="Global API Token"
                  type="password"
                  value={platformSettings.mailketing_api_token || ''}
                  onChange={e => setPlatformSettings({ ...platformSettings, mailketing_api_token: e.target.value })}
                  placeholder="Platform Mailketing API Token..."
                  leftIcon={<Key size={16} />}
                />

                <Input
                  label="Global Sender Name"
                  type="text"
                  value={platformSettings.mailketing_from_name || ''}
                  onChange={e => setPlatformSettings({ ...platformSettings, mailketing_from_name: e.target.value })}
                  leftIcon={<User size={16} />}
                />

                <Input
                  label="Global Sender Email"
                  type="email"
                  value={platformSettings.mailketing_from_email || ''}
                  onChange={e => setPlatformSettings({ ...platformSettings, mailketing_from_email: e.target.value })}
                  placeholder="system@yourdomain.com"
                  leftIcon={<Globe size={16} />}
                />

                <Button
                  type="submit"
                  isLoading={isProcessing}
                  variant="primary"
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
                  leftIcon={<Save size={18} />}
                >
                  Simpan Pengaturan Email
                </Button>
              </form>

              <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 space-y-8 flex flex-col">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-gray-100">
                      <Send size={18} />
                    </div>
                    <Label className="text-gray-900 uppercase text-xs">Uji Coba Pengiriman</Label>
                  </div>
                  <Input
                    label="Email Penerima Test"
                    type="email"
                    value={testRecipient}
                    onChange={e => setTestRecipient(e.target.value)}
                    placeholder="tujuan@email.com"
                    className="bg-white border-gray-200"
                  />
                </div>

                <div className="flex-1 flex flex-col justify-end gap-4">
                  <div className="p-4 bg-white/50 rounded-xl flex gap-3 border border-gray-200">
                    <Info size={16} className="text-blue-500 shrink-0" />
                    <Subtext className="text-[10px] text-gray-500 leading-relaxed italic">Gunakan fitur ini untuk memastikan Platform Global Email Relay terhubung dengan benar ke server Mailketing.</Subtext>
                  </div>
                  <Button
                    onClick={handleSendTestEmail}
                    isLoading={isTestingEmail}
                    disabled={!testRecipient}
                    variant="primary"
                    className="w-full bg-gray-900 hover:bg-black"
                    leftIcon={<Sparkles size={18} />}
                  >
                    Kirim Email Uji Coba
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      <PlatformWorkspaceFormModal
        isOpen={isCoModalOpen}
        onClose={() => setIsCoModalOpen(false)}
        form={coForm}
        setForm={setCoForm}
        onSave={handleSaveCompany}
        isProcessing={isProcessing}
      />

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
      />

      <PlatformAccessModal
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        accessMode={accessMode}
        searchTerm={accessSearchTerm}
        setSearchTerm={setAccessSearchTerm}
        filteredItems={filteredItems}
        selectedWithRoles={selectedWithRoles}
        rolesByCompany={rolesByCompany}
        onToggleAccessWithRole={handleToggleAccessWithRole}
        onSaveAccess={saveAccess}
        isProcessing={isProcessing}
      />

      <ConfirmDeleteModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmDelete}
        itemName={pendingDelete?.type === 'company' ? 'Workspace' : 'User'}
        description="Tindakan ini permanen. Seluruh data yang terhubung dengan entitas ini akan ikut terhapus atau kehilangan referensi."
        isProcessing={isProcessing}
      />

      <PlatformUserFormModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        form={userForm}
        setForm={setFormUser}
        onSave={handleSaveUser}
        isProcessing={isProcessing}
      />

    </div>
  );
};
