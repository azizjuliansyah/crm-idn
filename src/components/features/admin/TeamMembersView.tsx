'use client';
import React, { useState } from 'react';
import { Button, Table, TableHeader, TableBody, TableRow, TableCell, Subtext, Badge, H2, Label } from '@/components/ui';
import { useAppStore } from '@/lib/store/useAppStore';
import { supabase } from '@/lib/supabase';
import { Company, CompanyMember, CompanyRole, Profile } from '@/lib/types';
import { Trash2, Plus, UserPlus2 } from 'lucide-react';

import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { AdminInviteMemberModal } from './components/AdminInviteMemberModal';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';

interface Props {
  company: Company;
  members: CompanyMember[];
  roles: CompanyRole[];
  user: Profile;
  onUpdate: () => void;
}

export const TeamMembersView: React.FC<Props> = ({ company, members, roles, user, onUpdate }) => {
  const { showToast } = useAppStore();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role_id: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const { data: profile, error: profErr } = await supabase.from('profiles').select('id').eq('email', inviteForm.email.trim()).maybeSingle();
      if (profErr) throw profErr;

      if (profile) {
        const { error: insErr } = await supabase.from('company_members').insert({ company_id: company.id, user_id: profile.id, role_id: inviteForm.role_id });
        if (insErr) throw insErr;
        setIsInviteModalOpen(false);
        setInviteForm({ email: '', role_id: '' });
        onUpdate();
        showToast('Anggota berhasil diundang ke workspace.', 'success');
      } else {
        showToast('User dengan email tersebut belum terdaftar di platform.', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setIsProcessing(true);
    try {
      const { error: delErr } = await supabase.from('company_members').delete().eq('id', pendingDelete);
      if (delErr) throw delErr;
      setIsConfirmModalOpen(false);
      setPendingDelete(null);
      onUpdate();
      showToast('Anggota berhasil dihapus.', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6 max-w-5xl">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div>
          <H2 className="text-xl ">Anggota Tim</H2>
          <Subtext className="text-[10px] uppercase font-semibold text-gray-400">Kelola akses dan keanggotaan staf di workspace Anda.</Subtext>
        </div>
        <Button
          onClick={() => setIsInviteModalOpen(true)}
          leftIcon={<Plus size={14} strokeWidth={3} />}
          className="!px-6 py-2.5 text-[10px] uppercase shadow-lg shadow-blue-100"
          variant='primary'
          size='sm'
        >
          Tambah Anggota
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col relative">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="py-4 px-6 font-bold text-gray-900 uppercase text-[10px]">Nama & Email</TableCell>
              <TableCell isHeader className="py-4 px-6 font-bold text-gray-900 uppercase text-[10px]">Jabatan / Role</TableCell>
              <TableCell isHeader className="text-center py-4 px-6 font-bold text-gray-900 uppercase text-[10px]">Aksi</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map(m => (
              <TableRow key={m.id}>
                <TableCell className="flex items-center gap-3 py-4 px-6">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300 overflow-hidden shrink-0 shadow-sm">
                    {m.profile?.avatar_url ? (
                      <img src={m.profile.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
                    ) : (
                      <UserPlus2 size={20} />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <Label className="text-[13px] font-semibold text-gray-900">{m.profile?.full_name}</Label>
                    <Subtext className="text-[11px] text-gray-400 font-medium">{m.profile?.email || '-'}</Subtext>
                  </div>
                </TableCell>
                <TableCell className="py-4 px-6 text-gray-600">
                  <Badge variant="primary" className="px-3 py-1 text-[10px] uppercase font-bold">
                    {m.company_roles?.name || 'Member'}
                  </Badge>
                </TableCell>
                <TableCell className="text-center py-4 px-6">
                  {m.profile?.id !== user.id && (
                    <div className="flex items-center justify-center">
                      <ActionButton
                        icon={Trash2}
                        variant="rose"
                        onClick={() => { setPendingDelete(m.id); setIsConfirmModalOpen(true); }}
                      />
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AdminInviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        form={inviteForm}
        setForm={setInviteForm}
        onInvite={handleInvite}
        isProcessing={isProcessing}
        roles={roles}
      />

      <ConfirmDeleteModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleDelete}
        itemName="Anggota Tim"
        description="Hapus anggota tim ini secara permanen?"
        isProcessing={isProcessing}
      />
    </div>
  );
};
