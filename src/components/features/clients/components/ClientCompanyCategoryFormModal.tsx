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
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="ghost" onClick={onClose} disabled={isProcessing} className="rounded-md">
            Batal
          </Button>
          <Button onClick={(e) => onSave(form)} disabled={isProcessing} variant="primary" className="rounded-md">
            {isProcessing && <Loader2 className="animate-spin" size={14} />} Simpan Kategori
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pb-2">
        <div className="space-y-2">
          <Label className="text-[10px]  text-gray-400 uppercase  ml-1">Nama Kategori</Label>
          <Input
            type="text"
            value={form.name || ''}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Misal: Prospektif, High-Value, Corporate..."
          />
        </div>
      </div>
    </Modal>
  );
};
