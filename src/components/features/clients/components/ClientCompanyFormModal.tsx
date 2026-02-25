import React, { useState } from 'react';
import { Input, Select, Textarea, Button, Label, Modal } from '@/components/ui';
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
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [catProcessing, setCatProcessing] = useState(false);

  const handleQuickAddCategoryInner = async () => {
    if (!newCatName.trim()) return;
    setCatProcessing(true);
    try {
      const addedCat = await onQuickAddCategory(newCatName.trim());
      if (addedCat) {
        setForm(prev => ({ ...prev, category_id: addedCat.id }));
        setNewCatName('');
        setIsAddingCategory(false);
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
        setIsAddingCategory(false);
      }}
      title={form.id ? "Edit Perusahaan" : "Tambah Perusahaan Baru"}
      size="lg"
      footer={
        <Button onClick={(e) => onSave(form)} disabled={isProcessing} className="px-10 py-4 bg-indigo-600 text-white rounded-lg  text-xs uppercase tracking-tight shadow-xl flex items-center gap-2">
          {isProcessing && <Loader2 className="animate-spin" size={14} />} Simpan Data
        </Button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 pb-4">
        <div className="space-y-2">
          <Label className="text-[10px]  text-gray-400 uppercase tracking-tight ml-1">Nama Perusahaan*</Label>
          <Input type="text" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-lg  outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-sm" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[10px]  text-gray-400 uppercase tracking-tight ml-1">Kategori*</Label>
            <Button type="button" onClick={() => setIsAddingCategory(!isAddingCategory)} className="text-[8px]  text-indigo-600 uppercase hover:underline">{isAddingCategory ? 'Batal' : '+ Kategori'}</Button>
          </div>
          {isAddingCategory ? (
            <div className="flex gap-2">
              <Input autoFocus type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="flex-1 px-4 py-3 bg-gray-50 border border-indigo-100 rounded-lg  text-xs" />
              <Button onClick={handleQuickAddCategoryInner} disabled={catProcessing} className="px-3 bg-indigo-600 text-white rounded-lg">{catProcessing ? <Loader2 size={12} className="animate-spin" /> : <Check size={14} />}</Button>
            </div>
          ) : (
            <Select value={form.category_id || ''} onChange={e => setForm({ ...form, category_id: Number(e.target.value) })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-lg  outline-none cursor-pointer">
              <option value="">Pilih Kategori</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </Select>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-[10px]  text-gray-400 uppercase tracking-tight ml-1">Email Perusahaan</Label>
          <Input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-lg  outline-none shadow-sm focus:bg-white focus:border-indigo-500 transition-all" />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px]  text-gray-400 uppercase tracking-tight ml-1">WhatsApp / No. Telp</Label>
          <Input type="text" value={form.whatsapp || ''} onChange={e => setForm({ ...form, whatsapp: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-lg  outline-none shadow-sm focus:bg-white focus:border-indigo-500 transition-all" placeholder="08..." />
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label className="text-[10px]  text-gray-400 uppercase tracking-tight ml-1">Alamat Kantor*</Label>
          <Textarea value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-lg font-medium h-32 outline-none resize-none focus:bg-white focus:border-indigo-500 shadow-sm transition-all" />
        </div>
      </div>
    </Modal>
  );
};
