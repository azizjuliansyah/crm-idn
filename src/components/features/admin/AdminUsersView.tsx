'use client';

import React, { useState } from 'react';
import { 
  Plus, Edit2, Trash2, Search, MoreVertical, ShieldAlert, UserPlus, Key 
} from 'lucide-react';
import { 
  Button, Table, TableHeader, TableBody, TableRow, TableCell, 
  Subtext, Avatar, Card, Badge, Toast, ToastType, Select 
} from '@/components/ui';
import { ActionMenu } from '@/components/shared/ActionMenu';
import { StandardFilterBar } from '@/components/shared/filters/StandardFilterBar';
import { Company, Profile, CompanyRole } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { PlatformUserFormModal } from './components/PlatformUserFormModal';
import { PlatformAccessModal } from './components/PlatformAccessModal';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a client specifically for sending reset links using the implicit flow.
// This avoids PKCE verifier errors when the link is opened in a different browser.
const implicitSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'implicit',
    persistSession: false
  }
});

interface AdminUsersViewProps {
  initialUsers: Profile[];
  allCompanies: Company[];
}

export const AdminUsersView: React.FC<AdminUsersViewProps> = ({ 
  initialUsers,
  allCompanies 
}) => {
  const [users, setUsers] = useState<Profile[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
    isOpen: false,
    message: '',
    type: 'success',
  });

  const [userForm, setFormUser] = useState({ id: '', full_name: '', email: '', whatsapp: '', password: '', platform_role: 'USER' as any });
  const [pendingDelete, setPendingDelete] = useState<{ id: number | string, type: 'company' | 'user' } | null>(null);
  
  const [accessMode, setAccessMode] = useState<{ type: 'user_to_companies' | 'company_to_users', target: any }>({ type: 'user_to_companies', target: null });
  const [selectedWithRoles, setSelectedWithRoles] = useState<Record<string | number, string>>({});
  const [rolesByCompany, setRolesByCompany] = useState<Record<number, CompanyRole[]>>({});
  const [accessSearchTerm, setAccessSearchTerm] = useState('');

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  const fetchData = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data);
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
      showToast('User berhasil disimpan.');
    } catch (err: any) { showToast(err.message, 'error'); } finally { setIsProcessing(false); }
  };

  const openAccessModal = async (target: any) => {
    setAccessMode({ type: 'user_to_companies', target });
    setSelectedWithRoles({});
    setAccessSearchTerm('');
    setIsProcessing(true);
    try {
      const currentRolesGrouped = await fetchAllRoles();
      const { data } = await supabase.from('company_members').select('company_id, user_id, role_id').eq('user_id', target.id);
      if (data) {
        const mapping: Record<string | number, string> = {};
        data.forEach(d => {
          mapping[d.company_id] = d.role_id || (currentRolesGrouped[d.company_id]?.[0]?.id || '');
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
      await supabase.from('company_members').delete().eq('user_id', target.id);
      const inserts = Object.entries(selectedWithRoles).map(([coId, roleId]) => ({ user_id: target.id, company_id: parseInt(coId), role_id: roleId }));
      if (inserts.length > 0) await supabase.from('company_members').insert(inserts);
      setIsAccessModalOpen(false);
      showToast('Akses workspace berhasil diperbarui.');
    } catch (err: any) { showToast(err.message, 'error'); } finally { setIsProcessing(false); }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setIsProcessing(true);
    try {
      await supabase.from('profiles').delete().eq('id', pendingDelete.id);
      fetchData();
    } catch (error: any) { showToast(error.message, 'error'); } finally { setIsConfirmModalOpen(false); setPendingDelete(null); setIsProcessing(false); }
  };

  const handleToggleSuspension = async (userId: string, currentStatus: boolean) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_suspended: !currentStatus })
        .eq('id', userId);
      
      if (error) throw error;
      
      showToast(`User ${!currentStatus ? 'ditangguhkan' : 'diaktifkan kembali'}.`);
      fetchData();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetPassword = async (email: string) => {
    setIsProcessing(true);
    try {
      const { error } = await implicitSupabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      showToast(`Link reset password telah dikirim ke ${email}.`);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredUsers = React.useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.whatsapp && u.whatsapp.includes(searchTerm));
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && !u.is_suspended) || 
        (statusFilter === 'suspended' && u.is_suspended);
        
      return matchesSearch && matchesStatus;
    });
  }, [users, searchTerm, statusFilter]);

  const filteredItems = allCompanies.filter(co => String(co.id).includes(accessSearchTerm) || co.name.toLowerCase().includes(accessSearchTerm.toLowerCase())).sort((a, b) => a.id - b.id);

  return (
    <div className="flex flex-col gap-6">
      <StandardFilterBar
        title="Data Pengguna"
        subtitle={`Total ${filteredUsers.length} pengguna terdaftar`}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Cari nama, email, atau whatsapp..."
        primaryAction={{
          label: "Buat User",
          onClick: () => { setFormUser({ id: '', full_name: '', email: '', whatsapp: '', password: '', platform_role: 'USER' }); setIsUserModalOpen(true); },
          icon: <UserPlus size={14} />
        }}
      >
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="!py-2 !px-4 !text-[10px] !h-[38px] min-w-[120px]"
          containerClassName="!space-y-0"
        >
          <option value="all">SEMUA STATUS</option>
          <option value="active">AKTIF</option>
          <option value="suspended">DITANGGUHKAN</option>
        </Select>
      </StandardFilterBar>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="w-4"></TableCell>
              <TableCell isHeader>User & Email</TableCell>
              <TableCell isHeader>Role Platform</TableCell>
              <TableCell isHeader className="text-center">Workspace</TableCell>
              <TableCell isHeader className="text-center">Aksi</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map(u => (
              <TableRow key={u.id}>
                <TableCell className="w-4">
                  <div className={`w-2 h-2 rounded-full ${u.is_suspended ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} title={u.is_suspended ? 'Suspended' : 'Active'} />
                </TableCell>
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
                    onClick={() => openAccessModal(u)}
                    variant="primary"
                    size="sm"
                  >
                    Atur Workspace
                  </Button>
                </TableCell>
                <TableCell className="text-center">
                  <ActionMenu>
                    <button
                      onClick={() => { setFormUser({ id: u.id, full_name: u.full_name, email: u.email, whatsapp: u.whatsapp || '', password: '', platform_role: u.platform_role }); setIsUserModalOpen(true); }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 flex items-center gap-2 transition-colors"
                    >
                      <Edit2 size={14} />
                      Edit User
                    </button>
                    <button
                      onClick={() => { setPendingDelete({ id: u.id, type: 'user' }); setIsConfirmModalOpen(true); }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                    >
                      <Trash2 size={14} />
                      Hapus User
                    </button>
                    <button
                      onClick={() => handleToggleSuspension(u.id, !!u.is_suspended)}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-amber-600 hover:bg-amber-50 flex items-center gap-2 transition-colors"
                    >
                      <ShieldAlert size={14} />
                      {u.is_suspended ? 'Aktifkan User' : 'Tangguhkan User'}
                    </button>
                    <button
                      onClick={() => handleResetPassword(u.email)}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 transition-colors"
                    >
                      <Key size={14} />
                      Kirim Link Reset Password
                    </button>
                  </ActionMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <PlatformUserFormModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        form={userForm}
        setForm={setFormUser}
        onSave={handleSaveUser}
        isProcessing={isProcessing}
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
        itemName="User"
        description="Tindakan ini permanen. Seluruh data yang terhubung dengan entitas ini akan ikut terhapus atau kehilangan referensi."
        isProcessing={isProcessing}
      />

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
