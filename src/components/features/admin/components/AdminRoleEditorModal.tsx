import { useState, useMemo } from 'react';
import { Input, Button, Label, Modal, Table, TableBody, TableRow, TableCell, Toggle, SearchInput } from '@/components/ui';

interface PermissionListProps {
  available: string[];
  selected: string[];
  onToggle: (perm: string) => void;
}

const PermissionsList: React.FC<PermissionListProps> = ({ available, selected, onToggle }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPermissions = useMemo(() => {
    return available.filter(perm => perm.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [available, searchTerm]);

  return (
    <div className="flex flex-col space-y-3">
      <div className="w-full">
        <SearchInput 
          placeholder="Cari Hak Akses..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
      </div>
      <div className="max-h-[60vh] overflow-y-auto border-2 border-gray-300 rounded-xl rounded-b-none custom-scrollbar">
        <Table>
          <TableBody>
            {filteredPermissions.length > 0 ? (
              filteredPermissions.map(perm => (
                <TableRow key={perm} className="border-b-2 border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                  <TableCell className="py-3 px-4">
                    <Label className="text-[13px] font-medium text-gray-700">{perm}</Label>
                  </TableCell>
                  <TableCell className="text-left py-3 px-4 w-[100px]">
                    <Toggle
                      checked={selected.includes(perm)}
                      onChange={() => onToggle(perm)}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-6 text-gray-400 !font-medium text-[13px] italic">
                  Hak akses tidak ditemukan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {filteredPermissions.length > 0 && (
         <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500 rounded-b-xl border-2 border-gray-300 border-t-0 flex justify-between">
           <span>Total: {filteredPermissions.length} item</span>
           <span>Terpilih: {selected.length}</span>
         </div>
      )}
    </div>
  );
};

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
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Role Editor" 
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="ghost" onClick={onClose} disabled={isProcessing} className="rounded-md">
            Batal
          </Button>
          <Button onClick={onSave} isLoading={isProcessing} variant='primary' className="rounded-md">
            Simpan Role
          </Button>
        </div>
      }
    >
      <div className="space-y-6 pb-4">
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
      </div>
    </Modal>
  );
};
