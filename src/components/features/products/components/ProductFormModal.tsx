import React, { useState, useEffect } from 'react';
import { Input, Textarea, Button, Label, Modal, ComboBox } from '@/components/ui';
import { Loader2, Check, Package, Tags, Scale, X } from 'lucide-react';
import { Product, ProductCategory, ProductUnit } from '@/lib/types';
import { useProductMutations } from '@/lib/hooks/useProductsQuery';

interface ProductFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    companyId: number;
    categories: ProductCategory[];
    units: ProductUnit[];
    onSuccess: (product: Product) => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
    isOpen,
    onClose,
    product,
    companyId,
    categories,
    units,
    onSuccess
}) => {
    const [form, setForm] = useState<Partial<Product>>({
        name: '', 
        category_id: null, 
        unit_id: null, 
        price: 0, 
        description: ''
    });

    const [isAddingCat, setIsAddingCat] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [isAddingUnit, setIsAddingUnit] = useState(false);
    const [newUnitName, setNewUnitName] = useState('');

    const { upsertProduct, addCategory, addUnit } = useProductMutations();

    useEffect(() => {
        if (product) {
            setForm(product);
        } else {
            setForm({
                name: '', 
                category_id: categories[0]?.id || null, 
                unit_id: units[0]?.id || null, 
                price: 0, 
                description: ''
            });
        }
    }, [product, categories, units, isOpen]);

    const handleSave = async () => {
        if (!form.name || form.price === undefined) return;
        try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { product_categories, product_units, count, ...updateData } = form as any;
            const data = await upsertProduct.mutateAsync({
                ...updateData,
                company_id: companyId
            });
            onSuccess(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleQuickAddCategory = async () => {
        if (!newCatName.trim()) return;
        try {
            const data = await addCategory.mutateAsync({ name: newCatName.trim(), company_id: companyId });
            setForm(prev => ({ ...prev, category_id: data.id }));
            setNewCatName('');
            setIsAddingCat(false);
        } catch (err) {
            console.error(err);
        }
    };

    const handleQuickAddUnit = async () => {
        if (!newUnitName.trim()) return;
        try {
            const data = await addUnit.mutateAsync({ name: newUnitName.trim(), company_id: companyId });
            setForm(prev => ({ ...prev, unit_id: data.id }));
            setNewUnitName('');
            setIsAddingUnit(false);
        } catch (err) {
            console.error(err);
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
            title={product ? "Edit Data Produk" : "Tambah Produk Baru"}
            size="lg"
            footer={
                <div className="flex items-center justify-end gap-3 w-full">
                    <Button variant="ghost" onClick={onClose} disabled={upsertProduct.status === 'pending'} className="rounded-md text-[10px] uppercase font-bold tracking-wider">
                        Batal
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        isLoading={upsertProduct.status === 'pending'}
                        disabled={upsertProduct.status === 'pending'} 
                        variant='primary'
                        className="rounded-md text-[10px] uppercase font-bold tracking-wider shadow-lg shadow-blue-100"
                    >
                        Simpan Produk
                    </Button>
                </div>
            }
        >
            <div className="flex flex-col gap-6 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <Input
                            label="Nama Produk*"
                            type="text"
                            value={form.name || ''}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            leftIcon={<Package size={18} />}
                            placeholder="Nama produk atau jasa..."
                            className="bg-gray-50 focus:bg-white focus:border-emerald-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] text-gray-400 uppercase ml-1">Kategori Produk</Label>
                        {isAddingCat ? (
                            <div className="flex gap-2 animate-in slide-in-from-left-2 duration-200">
                                <Input
                                    autoFocus
                                    value={newCatName}
                                    onChange={e => setNewCatName(e.target.value)}
                                    className="flex-1 bg-indigo-50/30 border-indigo-100"
                                    placeholder="Kategori baru..."
                                />
                                <Button type="button" onClick={handleQuickAddCategory} isLoading={addCategory.status === 'pending'} className="px-3" variant="success">
                                    <Check size={14} />
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
                        <Label className="text-[10px] text-gray-400 uppercase ml-1">Satuan Produk</Label>
                        {isAddingUnit ? (
                            <div className="flex gap-2 animate-in slide-in-from-left-2 duration-200">
                                <Input
                                    autoFocus
                                    value={newUnitName}
                                    onChange={e => setNewUnitName(e.target.value)}
                                    className="flex-1 bg-emerald-50/30 border-emerald-100"
                                    placeholder="Satuan baru..."
                                />
                                <Button type="button" onClick={handleQuickAddUnit} isLoading={addUnit.status === 'pending'} className="px-3" variant="success">
                                    <Check size={14} />
                                </Button>
                                <Button type="button" variant="ghost" onClick={() => setIsAddingUnit(false)} className="p-2 text-gray-400"><X size={14} /></Button>
                            </div>
                        ) : (
                            <ComboBox
                                value={form.unit_id || ''}
                                onChange={(val: string | number) => setForm({ ...form, unit_id: val ? Number(val) : null })}
                                options={units.map(u => ({ value: u.id, label: u.name.toUpperCase() }))}
                                onAddNew={() => setIsAddingUnit(true)}
                                addNewLabel="Tambah Satuan Baru"
                                leftIcon={<Scale size={16} />}
                            />
                        )}
                    </div>

                    <div className="md:col-span-2">
                        <Input
                            label="Harga Jual Dasar (IDR)*"
                            type="number"
                            value={form.price || 0}
                            onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                            placeholder="0"
                            leftIcon={<div className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-100">RP</div>}
                            className="!font-bold !text-lg !h-12 !pl-14"
                        />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                        <Label className="text-[10px] text-gray-400 uppercase  ml-1">Deskripsi Produk (Opsional)</Label>
                        <Textarea
                            value={form.description || ''}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            className="w-full h-32 px-5 py-4 bg-gray-50 border border-gray-100 rounded-lg outline-none focus:bg-white focus:border-emerald-500 transition-all shadow-sm resize-none text-xs"
                            placeholder="Berikan detail mengenai produk atau layanan ini..."
                        />
                    </div>
                </div>
            </div>
        </Modal>
    );
};
