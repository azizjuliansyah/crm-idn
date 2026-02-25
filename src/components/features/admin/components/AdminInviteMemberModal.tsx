import React from 'react';
import { Input, Select, Button, Modal } from '@/components/ui';
import { CompanyRole } from '@/lib/types';

interface AdminInviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: { email: string; role_id: string };
  setForm: React.Dispatch<React.SetStateAction<{ email: string; role_id: string }>>;
  onInvite: (e: React.FormEvent) => Promise<void>;
  isProcessing: boolean;
  roles: CompanyRole[];
}

export const AdminInviteMemberModal: React.FC<AdminInviteMemberModalProps> = ({
  isOpen,
  onClose,
  form,
  setForm,
  onInvite,
  isProcessing,
  roles
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Undang Anggota">
      <div className="space-y-6">
        <Input 
           label="Email User" 
           type="email" 
           value={form.email} 
           onChange={e => setForm({...form, email: e.target.value})} 
           placeholder="email@user.com" 
        />
        <Select 
           label="Role" 
           value={form.role_id} 
           onChange={e => setForm({...form, role_id: e.target.value})}
        >
            <option value="">Pilih Role</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </Select>
        <Button onClick={onInvite} isLoading={isProcessing} className="w-full">
            Undang Sekarang
        </Button>
      </div>
    </Modal>
  );
};
