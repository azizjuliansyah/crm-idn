import React from 'react';
import { Modal, Input, Button, Label } from '@/components/ui';

interface PermissionListProps {
  available: string[];
  selected: string[];
  onToggle: (perm: string) => void;
}

const PermissionsList: React.FC<PermissionListProps> = ({ available, selected, onToggle }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 border border-gray-100 rounded-xl custom-scrollbar">
    {available.map(perm => (
      <button 
        key={perm}
        onClick={() => onToggle(perm)}
        className={`px-3 py-2 rounded-lg text-xs font-bold text-left transition-all ${selected.includes(perm) ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
      >
        {perm}
      </button>
    ))}
  </div>
);

interface AdminRoleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: { id: string; name: string; permissions: string[] };
  setForm: React.Dispatch<React.SetStateAction<{ id: string; name: string; permissions: string[] }>>;
  onSave: () => Promise<void>;
  isProcessing: boolean;
  availablePermissions: string[];
}

export const AdminRoleEditorModal: React.FC<AdminRoleEditorModalProps> = ({
  isOpen,
  onClose,
  form,
  setForm,
  onSave,
  isProcessing,
  availablePermissions
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Role Editor" size="lg">
      <div className="space-y-6">
        <Input 
           label="Nama Role" 
           type="text" 
           value={form.name} 
           onChange={e => setForm({...form, name: e.target.value})} 
           placeholder="Nama Role" 
        />
        
        <div className="space-y-2">
            <Label className="ml-1">Hak Akses Modul</Label>
            <PermissionsList 
              available={availablePermissions} 
              selected={form.permissions} 
              onToggle={(p) => setForm(prev => ({...prev, permissions: prev.permissions.includes(p) ? prev.permissions.filter(x => x !== p) : [...prev.permissions, p]}))} 
            />
        </div>

        <Button onClick={onSave} isLoading={isProcessing} className="w-full bg-indigo-600 hover:bg-indigo-700">
            Simpan Role
        </Button>
      </div>
    </Modal>
  );
};
