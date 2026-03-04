import React, { useState } from 'react';
import { Input, Textarea, Button, Label, Modal, ComboBox } from '@/components/ui';
import { Loader2, Check, Save, Package, Tags, Scale, X } from 'lucide-react';
import { Product, ProductCategory, ProductUnit } from '@/lib/types';

interface ProductFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (form: Partial<Product>) => Promise<void>;
    form: Partial<Product>;
    setForm: React.Dispatch<React.SetStateAction<Partial<Product>>>;
    isProcessing: boolean;

    categories: ProductCategory[];
    units: ProductUnit[];

    onQuickAddCategory: (name: string) => Promise<any>;
    onQuickAddUnit: (name: string) => Promise<any>;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
    isOpen,
    onClose,
    onSave,
    form,
    setForm,
    isProcessing,
    categories,
    units,
    onQuickAddCategory,
    onQuickAddUnit
}) => {
    const [isAddingCat, setIsAddingCat] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [catProcessing, setCatProcessing] = useState(false);

    const [isAddingUnit, setIsAddingUnit] = useState(false);
    const [newUnitName, setNewUnitName] = useState('');
    const [unitProcessing, setUnitProcessing] = useState(false);

    const handleQuickAddCategoryInner = async () => {
        if (!newCatName.trim()) return;
        setCatProcessing(true);
        try {
            const newCat = await onQuickAddCategory(newCatName.trim());
            if (newCat) {
                setForm(prev => ({ ...prev, category_id: newCat.id }));
                setNewCatName('');
                setIsAddingCat(false);
            }
        } finally {
            setCatProcessing(false);
        }
    };

    const handleQuickAddUnitInner = async () => {
        if (!newUnitName.trim()) return;
        setUnitProcessing(true);
        try {
            const newUnit = await onQuickAddUnit(newUnitName.trim());
            if (newUnit) {
                setForm(prev => ({ ...prev, unit_id: newUnit.id }));
                setNewUnitName('');
                setIsAddingUnit(false);
            }
        } finally {
            setUnitProcessing(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {
                onClose();
                setIsAddingCat(false);
                setIsAddingUnit(false);
            }}
            title={form.id ? "Edit Data Produk" : "Tambah Produk Baru"}
            size="lg"
            footer={
                <Button onClick={() => onSave(form)} disabled={isProcessing} variant='success'>
                    {isProcessing && <Loader2 className="animate-spin" size={14} />} Simpan Produk
                </Button>
            }
        >
            <div className="flex flex-col gap-6 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 space-y-2">
                        <Label className="text-[10px] text-gray-400 uppercase tracking-tight ml-1">Nama Produk*</Label>
                        <div className="relative">
                            <Package size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <Input
                                type="text"
                                value={form.name || ''}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                className="w-full pl-12 pr-5 py-3.5 bg-gray-50 border border-gray-100 rounded-lg outline-none focus:bg-white focus:border-emerald-500 transition-all shadow-sm"
                                placeholder="Nama produk atau jasa..."
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <Label className="text-[10px] text-gray-400 uppercase tracking-tight">Kategori Produk</Label>
                        </div>
                        {isAddingCat ? (
                            <div className="flex gap-2 animate-in slide-in-from-left-2 duration-200">
                                <Input
                                    autoFocus
                                    type="text"
                                    value={newCatName}
                                    onChange={e => setNewCatName(e.target.value)}
                                    className="flex-1 px-4 py-2.5 bg-indigo-50/30 border border-indigo-100 rounded-lg text-xs outline-none"
                                    placeholder="Kategori baru..."
                                />
                                <Button type="button" onClick={handleQuickAddCategoryInner} disabled={catProcessing || !newCatName.trim()} className="px-3 bg-indigo-600 text-white rounded-lg">
                                    {catProcessing ? <Loader2 size={12} className="animate-spin" /> : <Check size={14} />}
                                </Button>
                                <Button type="button" variant="ghost" onClick={() => setIsAddingCat(false)} className="p-2 text-gray-400"><X size={14} /></Button>
                            </div>
                        ) : (
                            <ComboBox
                                value={form.category_id || ''}
                                onChange={(val: string | number) => setForm({ ...form, category_id: val ? Number(val) : null })}
                                options={categories.map(c => ({ value: c.id, label: c.name }))}
                                onAddNew={() => setIsAddingCat(true)}
                                addNewLabel="Tambah Kategori Baru"
                                leftIcon={<Tags size={16} />}
                            />
                        )}
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <Label className="text-[10px] text-gray-400 uppercase tracking-tight">Satuan Produk</Label>
                        </div>
                        {isAddingUnit ? (
                            <div className="flex gap-2 animate-in slide-in-from-left-2 duration-200">
                                <Input
                                    autoFocus
                                    type="text"
                                    value={newUnitName}
                                    onChange={e => setNewUnitName(e.target.value)}
                                    className="flex-1 px-4 py-2.5 bg-emerald-50/30 border border-emerald-100 rounded-lg text-xs outline-none"
                                    placeholder="Satuan baru..."
                                />
                                <Button type="button" onClick={handleQuickAddUnitInner} disabled={unitProcessing || !newUnitName.trim()} className="px-3 bg-emerald-600 text-white rounded-lg">
                                    {unitProcessing ? <Loader2 size={12} className="animate-spin" /> : <Check size={14} />}
                                </Button>
                                <Button type="button" variant="ghost" onClick={() => setIsAddingUnit(false)} className="p-2 text-gray-400"><X size={14} /></Button>
                            </div>
                        ) : (
                            <ComboBox
                                value={form.unit_id || ''}
                                onChange={(val: string | number) => setForm({ ...form, unit_id: val ? Number(val) : null })}
                                options={units.map(u => ({ value: u.id, label: u.name }))}
                                onAddNew={() => setIsAddingUnit(true)}
                                addNewLabel="Tambah Satuan Baru"
                                leftIcon={<Scale size={16} />}
                            />
                        )}
                    </div>

                    <div className="md:col-span-2 space-y-2">
                        <Label className="text-[10px] text-gray-400 uppercase tracking-tight ml-1">Harga Jual Dasar (IDR)*</Label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-xs">Rp</div>
                            <Input
                                type="number"
                                value={form.price || 0}
                                onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                                className="w-full pl-12 pr-5 py-3.5 bg-white border border-gray-100 rounded-lg outline-none focus:border-emerald-500 transition-all shadow-sm font-semibold text-gray-900"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2 space-y-2">
                        <Label className="text-[10px] text-gray-400 uppercase tracking-tight ml-1">Deskripsi Produk (Opsional)</Label>
                        <Textarea
                            value={form.description || ''}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            className="w-full h-32 px-5 py-4 bg-gray-50 border border-gray-100 rounded-lg outline-none focus:bg-white focus:border-emerald-500 transition-all shadow-sm resize-none"
                            placeholder="Berikan detail mengenai produk atau layanan ini..."
                        />
                    </div>
                </div>
            </div>
        </Modal>
    );
};
