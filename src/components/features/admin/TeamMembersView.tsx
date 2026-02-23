import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, CompanyMember, CompanyRole, Profile } from '@/lib/types';
import { UserPlus, Trash2, Loader2, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { 
  Button, 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableCell, 
  Badge, 
  Card, 
  Avatar,
  Subtext
} from '@/components/ui';

import { AdminInviteMemberModal } from './components/AdminInviteMemberModal';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { NotificationModal } from '@/components/shared/modals/NotificationModal';

interface Props {
  company: Company;
  members: CompanyMember[];
  roles: CompanyRole[];
  user: Profile;
  onUpdate: () => void;
}

export const TeamMembersView: React.FC<Props> = ({ company, members, roles, user, onUpdate }) => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role_id: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [alert, setAlert] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' }>({ isOpen: false, title: '', message: '', type: 'success' });

  const showAlert = (title: string, message: string, type: 'success' | 'error') => {
    setAlert({ isOpen: true, title, message, type });
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
        const { data: profile } = await supabase.from('profiles').select('id').eq('email', inviteForm.email.trim()).maybeSingle();
        if (profile) {
            await supabase.from('company_members').insert({ company_id: company.id, user_id: profile.id, role_id: inviteForm.role_id });
            setIsInviteModalOpen(false); 
            setInviteForm({ email: '', role_id: '' });
            onUpdate();
            showAlert('Berhasil', 'Anggota berhasil diundang ke workspace.', 'success');
        } else { 
            showAlert('Tidak Ditemukan', 'User dengan email tersebut belum terdaftar di platform.', 'error');
        }
    } catch (err: any) {
        showAlert('Gagal', err.message, 'error');
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
      if (!pendingDelete) return;
      setIsProcessing(true);
      try {
        await supabase.from('company_members').delete().eq('id', pendingDelete);
        setIsConfirmModalOpen(false);
        setPendingDelete(null);
        onUpdate();
        showAlert('Berhasil', 'Anggota berhasil dihapus.', 'success');
      } catch (err: any) {
        showAlert('Gagal', err.message, 'error');
      } finally {
        setIsProcessing(false);
      }
  };

  return (
    <Card 
      title="Anggota Tim" 
      action={
        <Button 
          onClick={() => setIsInviteModalOpen(true)} 
          size="sm"
          leftIcon={<UserPlus size={14} />}
        >
          Tambah
        </Button>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableCell isHeader>Nama & Email</TableCell>
            <TableCell isHeader>Jabatan / Role</TableCell>
            <TableCell isHeader className="text-center">Aksi</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map(m => (
            <TableRow key={m.id}>
              <TableCell className="flex items-center gap-3">
                <Avatar 
                  src={m.profile?.avatar_url || ''} 
                  name={m.profile?.full_name || '?'} 
                  shape="square" 
                  size="lg" 
                />
                <div>
                  <p className="font-bold">{m.profile?.full_name}</p>
                  <Subtext className="text-xs">{m.profile?.email || '-'}</Subtext>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="primary" className="px-3 py-1">
                  {m.company_roles?.name || 'Member'}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                {m.profile?.id !== user.id && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-2 text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
                    onClick={() => { setPendingDelete(m.id); setIsConfirmModalOpen(true); }}
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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

      <NotificationModal
        isOpen={alert.isOpen}
        onClose={() => setAlert({ ...alert, isOpen: false })}
        title={alert.title}
        message={alert.message}
        type={alert.type}
      />
    </Card>
  );
};
