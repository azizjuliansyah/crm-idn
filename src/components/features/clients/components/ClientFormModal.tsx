import React, { useState, useMemo } from 'react';
import { Input, Button, Subtext, Label, Modal, ComboBox } from '@/components/ui';
import { Loader2, Check, Save, Tags, MapPin, X } from 'lucide-react';
import { Client, ClientCompany, ClientCompanyCategory } from '@/lib/types';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: Partial<Client>) => Promise<void>;
  form: Partial<Client>;
  setForm: React.Dispatch<React.SetStateAction<Partial<Client>>>;
  isProcessing: boolean;

  clientCompanies: ClientCompany[];
  categories: ClientCompanyCategory[];
  companyId: number;

  onQuickAddCompany: (newCo: any) => Promise<any>;
  onQuickAddCategory: (newCatName: string) => Promise<any>;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  form,
  setForm,
  isProcessing,
  clientCompanies,
  categories,
  companyId,
  onQuickAddCompany,
  onQuickAddCategory
}) => {
  const [isAddingCo, setIsAddingCo] = useState(false);
  const [newCo, setNewCo] = useState({ name: '', category_id: '', address: '' });
  const [coProcessing, setCoProcessing] = useState(false);

  const [isAddingCatInCo, setIsAddingCatInCo] = useState(false);
  const [newCatInCoName, setNewCatInCoName] = useState('');
  const [catInCoProcessing, setCatInCoProcessing] = useState(false);

  const selectedCoDetails = React.useMemo(() => {
    if (!form.client_company_id) return null;
    return clientCompanies.find(co => co.id === form.client_company_id) || null;
  }, [form.client_company_id, clientCompanies]);

  const handleQuickAddCategoryInner = async () => {
    if (!newCatInCoName.trim()) return;
    setCatInCoProcessing(true);
    try {
      const newCat = await onQuickAddCategory(newCatInCoName.trim());
      if (newCat) {
        setNewCo(prev => ({ ...prev, category_id: String(newCat.id) }));
        setNewCatInCoName('');
        setIsAddingCatInCo(false);
      }
    } finally {
      setCatInCoProcessing(false);
    }
  };

  const handleQuickAddCompanyInner = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newCo.name.trim() || !newCo.category_id || !newCo.address.trim()) {
      // Handled by parent or just alert/toast
      return;
    }
    setCoProcessing(true);
    try {
      const addedCo = await onQuickAddCompany({
        name: newCo.name.trim(),
        category_id: parseInt(newCo.category_id),
        address: newCo.address.trim(),
        company_id: companyId
      });
      if (addedCo) {
        setForm(prev => ({ ...prev, client_company_id: addedCo.id }));
        setIsAddingCo(false);
        setNewCo({ name: '', category_id: '', address: '' });
        setIsAddingCatInCo(false);
      }
    } finally {
      setCoProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setIsAddingCo(false);
        setIsAddingCatInCo(false);
      }}
      title={form.id ? "Edit Data Client" : "Tambah Client Baru"}
      size="lg"
      footer={
        <Button onClick={(e) => onSave(form)} disabled={isProcessing} variant='success'>
          {isProcessing && <Loader2 className="animate-spin" size={14} />} Simpan Client
        </Button>
      }
    >
      <div className="flex flex-col gap-6 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <ComboBox
              label="Sapaan"
              value={form.salutation || ''}
              onChange={(val: string | number) => setForm({ ...form, salutation: val.toString() })}
              options={[
                { value: '', label: 'Pilih Sapaan' },
                { value: 'Bapak', label: 'Bapak' },
                { value: 'Ibu', label: 'Ibu' },
              ]}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px]  text-gray-400 uppercase tracking-tight ml-1">Nama Lengkap Client</Label>
            <Input type="text" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-lg  outline-none focus:bg-white focus:border-emerald-500 transition-all shadow-sm" placeholder="John Doe..." />
          </div>

          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center justify-between px-1">
              <Label className="text-[10px]  text-gray-400 uppercase tracking-tight">Pilih Perusahaan Client</Label>
            </div>

            {isAddingCo ? (
              <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-4 shadow-inner">
                <div className="flex justify-end mb-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsAddingCo(false)} className="!text-[10px] !p-1 !text-gray-400 uppercase">
                    <X size={10} className="mr-1" /> Batal Tambah
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[9px]  text-gray-400 uppercase">Nama Perusahaan*</Label>
                    <Input
                      type="text"
                      value={newCo.name}
                      onChange={e => setNewCo({ ...newCo, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-indigo-100 rounded-lg  text-xs outline-none"
                      placeholder="PT Contoh Jaya"
                    />
                  </div>
                  <div className="space-y-1">
                    {isAddingCatInCo ? (
                      <div className="animate-in slide-in-from-left-2 duration-200">
                        <Label className="text-[9px] text-gray-400 uppercase ml-1">Kategori Baru*</Label>
                        <div className="flex gap-2">
                          <Input
                            autoFocus
                            type="text"
                            value={newCatInCoName}
                            onChange={e => setNewCatInCoName(e.target.value)}
                            className="flex-1 px-3 py-2 bg-white border border-indigo-100 rounded-lg text-[10px] outline-none"
                            placeholder="Kategori..."
                          />
                          <Button
                            type="button"
                            variant="success"
                            size="sm"
                            onClick={handleQuickAddCategoryInner}
                            disabled={catInCoProcessing || !newCatInCoName.trim()}
                            className="!px-3"
                          >
                            {catInCoProcessing ? <Loader2 size={12} className="animate-spin" /> : <Check size={14} />}
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsAddingCatInCo(false)}
                            className="!px-3 text-gray-400"
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <ComboBox
                        value={newCo.category_id}
                        label="Pilih Kategori"
                        onChange={(val: string | number) => setNewCo({ ...newCo, category_id: val.toString() })}
                        options={categories.map(c => ({ value: c.id.toString(), label: c.name }))}
                        onAddNew={() => setIsAddingCatInCo(true)}
                        addNewLabel="Tambah Kategori Baru"
                      />
                    )}
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-[9px]  text-gray-400 uppercase">Alamat Perusahaan*</Label>
                    <Input type="text" value={newCo.address} onChange={e => setNewCo({ ...newCo, address: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-indigo-100 rounded-lg  text-xs outline-none" placeholder="Alamat..." />
                  </div>
                </div>
                <Button
                  type="button"
                  disabled={coProcessing}
                  onClick={handleQuickAddCompanyInner}
                  className="w-full"
                  variant="primary"
                >
                  {coProcessing ? <Loader2 size={12} className="animate-spin" /> : <Save size={14} />} SIMPAN & PILIH PERUSAHAAN
                </Button>
              </div>
            ) : (
              <ComboBox
                value={form.client_company_id || ''}
                onChange={(val: string | number) => setForm({ ...form, client_company_id: val ? Number(val) : null })}
                options={[
                  { value: '', label: '-- Personal / Tanpa Perusahaan --' },
                  ...clientCompanies.map(co => ({ value: co.id.toString(), label: co.name }))
                ]}
                onAddNew={() => setIsAddingCo(true)}
                addNewLabel="Tambah Perusahaan Baru"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-[10px]  text-gray-400 uppercase tracking-tight ml-1">Email Client</Label>
            <Input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-lg  outline-none shadow-sm focus:bg-white" placeholder="client@email.com" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px]  text-gray-400 uppercase tracking-tight ml-1">WhatsApp Client</Label>
            <Input type="text" value={form.whatsapp || ''} onChange={e => setForm({ ...form, whatsapp: e.target.value })} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-lg  outline-none shadow-sm focus:bg-white" placeholder="08..." />
          </div>
        </div>

        {selectedCoDetails && !isAddingCo && (
          <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-xl flex flex-col gap-4">
            <div className="flex items-center gap-2 text-indigo-600">
              <Label className="text-[10px]  uppercase tracking-tight">Informasi Perusahaan</Label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Subtext className="text-[9px]  text-gray-400 uppercase tracking-tight">Kategori</Subtext>
                <div className="flex items-center gap-2">
                  <Tags size={12} className="text-indigo-400" />
                  <Subtext className="text-xs  text-gray-700 uppercase">{(selectedCoDetails as any).client_company_categories?.name || 'Umum'}</Subtext>
                </div>
              </div>
              <div className="space-y-1">
                <Subtext className="text-[9px]  text-gray-400 uppercase tracking-tight">Alamat</Subtext>
                <div className="flex items-center gap-2">
                  <MapPin size={12} className="text-indigo-400 shrink-0" />
                  <Subtext className="text-xs  text-gray-600 truncate">{selectedCoDetails.address || '-'}</Subtext>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
