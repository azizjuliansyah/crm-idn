import React from 'react';
import { Modal, Input, Textarea, Button } from '@/components/ui';

interface PlatformWorkspaceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: { id: number | null; name: string; address: string };
  setForm: React.Dispatch<React.SetStateAction<{ id: number | null; name: string; address: string }>>;
  onSave: (e: React.FormEvent) => Promise<void>;
  isProcessing: boolean;
}

export const PlatformWorkspaceFormModal: React.FC<PlatformWorkspaceFormModalProps> = ({
  isOpen,
  onClose,
  form,
  setForm,
  onSave,
  isProcessing
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
         <Textarea 
            label="Alamat"
            value={form.address} 
            onChange={e => setForm({...form, address: e.target.value})} 
            className="h-24"
         />
         <Button 
            onClick={onSave} 
            isLoading={isProcessing} 
            className="w-full py-4"
         >
            Simpan Workspace
         </Button>
      </div>
    </Modal>
  );
};
