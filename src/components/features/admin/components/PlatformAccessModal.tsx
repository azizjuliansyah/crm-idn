import React from 'react';
import { Input, Button, Subtext, Modal, ComboBox, Toggle } from '@/components/ui';
import { Search, Save } from 'lucide-react';
import { CompanyRole } from '@/lib/types';

interface PlatformAccessModalProps {
   isOpen: boolean;
   onClose: () => void;
   accessMode: { type: 'user_to_companies' | 'company_to_users', target: any };
   searchTerm: string;
   setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
   filteredItems: any[];
   selectedWithRoles: Record<string | number, string>;
   rolesByCompany: Record<number, CompanyRole[]>;
   onToggleAccessWithRole: (id: string | number, roleId?: string) => void;
   onSaveAccess: () => Promise<void>;
   isProcessing: boolean;
}

export const PlatformAccessModal: React.FC<PlatformAccessModalProps> = ({
   isOpen,
   onClose,
   accessMode,
   searchTerm,
   setSearchTerm,
   filteredItems,
   selectedWithRoles,
   rolesByCompany,
   onToggleAccessWithRole,
   onSaveAccess,
   isProcessing
}) => {
   return (
      <Modal
         isOpen={isOpen}
         onClose={onClose}
         title={accessMode.type === 'user_to_companies' ? `Kelola Workspace: ${accessMode.target?.full_name}` : `Kelola Anggota: ${accessMode.target?.name}`}
         size="lg"
         footer={<Button onClick={onSaveAccess} isLoading={isProcessing} leftIcon={!isProcessing ? <Save size={14} /> : undefined} variant='primary'>Simpan Akses</Button>}
      >
         <div className="space-y-6">
            <Input
               placeholder="Cari..."
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               leftIcon={<Search size={14} />}
            />
            <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
               {filteredItems.map(item => {
                  const isSelected = !!selectedWithRoles[item.id];
                  const itemCoId = accessMode.type === 'user_to_companies' ? item.id : accessMode.target?.id;
                  const roles = rolesByCompany[itemCoId] || [];

                  return (
                     <div key={item.id} className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${isSelected ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-center gap-4">
                           <Toggle
                              checked={isSelected}
                              onChange={() => isSelected ? onToggleAccessWithRole(item.id) : onToggleAccessWithRole(item.id, roles[0]?.id || '')}
                              variant="blue"
                           />
                           <div>
                              <Subtext className="text-[13px]  text-gray-900">{accessMode.type === 'user_to_companies' ? item.name : item.full_name}</Subtext>
                              <Subtext className="text-[10px] text-gray-400  uppercase">{accessMode.type === 'user_to_companies' ? `ID: ${item.id}` : item.email}</Subtext>
                           </div>
                        </div>
                        {isSelected && roles.length > 0 && (
                           <ComboBox
                              value={selectedWithRoles[item.id] || roles[0]?.id}
                              onChange={(val: string | number) => onToggleAccessWithRole(item.id, val.toString())}
                              options={roles.map(r => ({ value: r.id, label: r.name }))}
                              className="!w-auto min-w-[120px]"
                           />
                        )}
                     </div>
                  );
               })}
            </div>
         </div>
      </Modal>
   );
};
