import React from 'react';
import { Input, Textarea, Button, Modal, Select } from '@/components/ui';

interface PlatformWorkspaceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: { id: number | null; name: string; address: string; package_id: number | null };
  setForm: React.Dispatch<React.SetStateAction<{ id: number | null; name: string; address: string; package_id: number | null }>>;
  onSave: (e: React.FormEvent) => Promise<void>;
  isProcessing: boolean;
  allPackages: any[];
}

export const PlatformWorkspaceFormModal: React.FC<PlatformWorkspaceFormModalProps> = ({
  isOpen,
  onClose,
  form,
  setForm,
  onSave,
  isProcessing,
  allPackages
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={form.id ? "Edit Workspace" : "Tambah Workspace"}>
      <div className="space-y-6">
         <Input 
            label="Nama Workspace"
            type="text" 
            value={form.name} 
            onChange={e => setForm({...form, name: e.target.value})} 
         />
         <Select
            label="Pilih Paket"
            value={form.package_id || ''}
            onChange={e => setForm({...form, package_id: e.target.value ? parseInt(e.target.value) : null})}
         >
            <option value="">Tanpa Paket</option>
            {allPackages.map(pkg => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.name} ({pkg.max_members} Anggota)
              </option>
            ))}
         </Select>
         <Textarea 
            label="Alamat"
            value={form.address} 
            onChange={e => setForm({...form, address: e.target.value})} 
            className="h-24"
         />
         <Button 
            onClick={onSave} 
            isLoading={isProcessing}
            variant='primary'
            className="w-full py-4"
         >
            Simpan Workspace
         </Button>
      </div>
    </Modal>
  );
};
