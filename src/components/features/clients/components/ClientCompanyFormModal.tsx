import React, { useState } from 'react';
import { Input, Textarea, Button, Label, Modal, ComboBox } from '@/components/ui';
import { Loader2, Check } from 'lucide-react';
import { ClientCompany, ClientCompanyCategory } from '@/lib/types';

interface ClientCompanyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: Partial<ClientCompany>) => Promise<void>;
  form: Partial<ClientCompany>;
  setForm: React.Dispatch<React.SetStateAction<Partial<ClientCompany>>>;
  isProcessing: boolean;

  categories: ClientCompanyCategory[];
  companyId: number;
  onQuickAddCategory: (newCatName: string) => Promise<any>;
}

export const ClientCompanyFormModal: React.FC<ClientCompanyFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  form,
  setForm,
  isProcessing,
  categories,
  companyId,
  onQuickAddCategory
}) => {
  const [catProcessing, setCatProcessing] = useState(false);

  const handleAddCategory = async () => {
    const name = prompt("Masukkan nama kategori baru:");
    if (!name) return;
    setCatProcessing(true);
    try {
      const addedCat = await onQuickAddCategory(name.trim());
      if (addedCat) {
        setForm(prev => ({ ...prev, category_id: addedCat.id }));
      }
    } finally {
      setCatProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
      }}
      title={form.id ? "Edit Perusahaan" : "Tambah Perusahaan Baru"}
      size="lg"
      footer={
        <Button onClick={(e) => onSave(form)} disabled={isProcessing} variant='primary'>
          {isProcessing && <Loader2 className="animate-spin" size={14} />} Simpan Data
        </Button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 pb-4">
        <Input
          label="Nama Perusahaan*"
          placeholder="Misal: PT. Teknologi Indonesia"
          type="text"
          value={form.name || ''}
          onChange={e => setForm({ ...form, name: e.target.value })}
        />

        <ComboBox
          label="Pilih Kategori"
          placeholder="Pilih Kategori"
          value={form.category_id || ''}
          onChange={(val: string | number) => setForm({ ...form, category_id: Number(val) })}
          options={categories.map(cat => ({ value: cat.id.toString(), label: cat.name }))}
          onAddNew={handleAddCategory}
          addNewLabel="Tambah Kategori Baru"
          disabled={catProcessing}
        />

        <Input
          label="Email Perusahaan"
          placeholder="perusahaan@email.com"
          type="email"
          value={form.email || ''}
          onChange={e => setForm({ ...form, email: e.target.value })}
        />

        <Input
          label="WhatsApp / No. Telp"
          placeholder="08..."
          type="text"
          value={form.whatsapp || ''}
          onChange={e => setForm({ ...form, whatsapp: e.target.value })}
        />

        <div className="md:col-span-2">
          <Textarea
            label="Alamat Kantor*"
            placeholder="Alamat lengkap kantor..."
            value={form.address || ''}
            onChange={e => setForm({ ...form, address: e.target.value })}
            className="h-32"
          />
        </div>
      </div>
    </Modal>
  );
};
