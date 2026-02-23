import React, { useState } from 'react';
import { Modal } from '@/components/ui';
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
        <button onClick={(e) => onSave(form)} disabled={isProcessing} className="px-10 py-4 bg-indigo-600 text-white rounded-lg font-bold text-xs uppercase tracking-widest shadow-xl flex items-center gap-2">
          {isProcessing && <Loader2 className="animate-spin" size={14} />} Simpan Data
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 pb-4">
         <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nama Perusahaan*</label>
            <input type="text" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-lg font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-sm" />
         </div>
         <div className="space-y-2">
            <div className="flex items-center justify-between">
               <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Kategori*</label>
               <button type="button" onClick={() => setIsAddingCategory(!isAddingCategory)} className="text-[8px] font-bold text-indigo-600 uppercase hover:underline">{isAddingCategory ? 'Batal' : '+ Kategori'}</button>
            </div>
            {isAddingCategory ? (
              <div className="flex gap-2">
                 <input autoFocus type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="flex-1 px-4 py-3 bg-gray-50 border border-indigo-100 rounded-lg font-bold text-xs" />
                 <button onClick={handleQuickAddCategoryInner} disabled={catProcessing} className="px-3 bg-indigo-600 text-white rounded-lg">{catProcessing ? <Loader2 size={12} className="animate-spin" /> : <Check size={14} />}</button>
              </div>
            ) : (
              <select value={form.category_id || ''} onChange={e => setForm({...form, category_id: Number(e.target.value)})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-lg font-bold outline-none cursor-pointer">
                <option value="">Pilih Kategori</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            )}
         </div>
         <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Perusahaan</label>
            <input type="email" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-lg font-bold outline-none shadow-sm focus:bg-white focus:border-indigo-500 transition-all" />
         </div>
         <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">WhatsApp / No. Telp</label>
            <input type="text" value={form.whatsapp || ''} onChange={e => setForm({...form, whatsapp: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-lg font-bold outline-none shadow-sm focus:bg-white focus:border-indigo-500 transition-all" placeholder="08..." />
         </div>
         <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Alamat Kantor*</label>
            <textarea value={form.address || ''} onChange={e => setForm({...form, address: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-lg font-medium h-32 outline-none resize-none focus:bg-white focus:border-indigo-500 shadow-sm transition-all" />
         </div>
      </div>
    </Modal>
  );
};
