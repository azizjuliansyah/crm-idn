import React from 'react';
import { Input, Button, Label, Modal } from '@/components/ui';
import { Loader2 } from 'lucide-react';
import { ClientCompanyCategory } from '@/lib/types';

interface ClientCompanyCategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: Partial<ClientCompanyCategory>) => Promise<void>;
  form: Partial<ClientCompanyCategory>;
  setForm: React.Dispatch<React.SetStateAction<Partial<ClientCompanyCategory>>>;
  isProcessing: boolean;
}

export const ClientCompanyCategoryFormModal: React.FC<ClientCompanyCategoryFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  form,
  setForm,
  isProcessing
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={form.id ? "Edit Kategori" : "Tambah Kategori Baru"}
      size="md"
      footer={
        <Button onClick={(e) => onSave(form)} disabled={isProcessing} className="px-10 py-4 bg-indigo-600 text-white rounded-xl  text-xs uppercase tracking-tight shadow-xl flex items-center gap-2">
          {isProcessing && <Loader2 className="animate-spin" size={14} />} Simpan Kategori
        </Button>
      }
    >
      <div className="space-y-4 pb-2">
        <div className="space-y-2">
          <Label className="text-[10px]  text-gray-400 uppercase tracking-tight ml-1">Nama Kategori</Label>
          <Input
            type="text"
            value={form.name || ''}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl  outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-sm"
            placeholder="Misal: Prospektif, High-Value, Corporate..."
          />
        </div>
      </div>
    </Modal>
  );
};
