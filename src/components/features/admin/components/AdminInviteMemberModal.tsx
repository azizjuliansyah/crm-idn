import React from 'react';
import { Input, Button, Modal, ComboBox } from '@/components/ui';
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
          onChange={e => setForm({ ...form, email: e.target.value })}
          placeholder="email@user.com"
        />
        <ComboBox
          label="Role"
          value={form.role_id}
          onChange={(val: string | number) => setForm({ ...form, role_id: val.toString() })}
          options={[
            ...roles.map(r => ({ value: r.id, label: r.name }))
          ]}
        />
        <Button onClick={onInvite} isLoading={isProcessing} className="w-full">
          Undang Sekarang
        </Button>
      </div>
    </Modal>
  );
};
