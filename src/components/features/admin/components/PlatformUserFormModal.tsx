import React from 'react';
import { Modal, Input, Select, Button } from '@/components/ui';

interface PlatformUserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: { 
    id: string; 
    full_name: string; 
    email: string; 
    whatsapp: string; 
    password?: string; 
    platform_role: 'USER' | 'ADMIN' | string 
  };
  setForm: React.Dispatch<React.SetStateAction<any>>;
  onSave: (e: React.FormEvent) => Promise<void>;
  isProcessing: boolean;
}

export const PlatformUserFormModal: React.FC<PlatformUserFormModalProps> = ({
  isOpen,
  onClose,
  form,
  setForm,
  onSave,
  isProcessing
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={form.id ? "Edit User" : "Buat User Baru"}>
      <div className="space-y-6">
         <Input 
           label="Nama Lengkap" 
           type="text" 
           value={form.full_name} 
           onChange={e => setForm({...form, full_name: e.target.value})} 
         />
         <Input 
           label="Alamat Email" 
           type="email" 
           value={form.email} 
           onChange={e => setForm({...form, email: e.target.value})} 
           disabled={!!form.id} 
         />
         <Input 
           label="WhatsApp" 
           type="text" 
           value={form.whatsapp} 
           onChange={e => setForm({...form, whatsapp: e.target.value})} 
         />
         {!form.id && (
           <Input 
             label="Password" 
             type="password" 
             value={form.password || ''} 
             onChange={e => setForm({...form, password: e.target.value})} 
             placeholder="Minimal 6 karakter..." 
           />
         )}
         <Select 
           label="Role Platform" 
           value={form.platform_role} 
           onChange={e => setForm({...form, platform_role: e.target.value})}
         >
            <option value="USER">USER (Standard)</option>
            <option value="ADMIN">ADMIN (Super Admin)</option>
         </Select>
         <Button onClick={onSave} isLoading={isProcessing} variant="success" className="w-full">
            Simpan Data User
         </Button>
      </div>
    </Modal>
  );
};
