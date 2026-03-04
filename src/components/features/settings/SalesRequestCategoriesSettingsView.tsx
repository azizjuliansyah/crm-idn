'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Input, Button, H3, Subtext, Label, Modal } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { SalesRequestCategory, Company } from '@/lib/types';
import {
    Loader2, Plus, GripVertical,
    Tags, ArrowUp, ArrowDown, Edit2, Trash2, Save
} from 'lucide-react';

interface Props {
    company: Company;
}

export const SalesRequestCategoriesSettingsView: React.FC<Props> = ({ company }) => {
    const [categories, setCategories] = useState<SalesRequestCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [form, setForm] = useState<Partial<SalesRequestCategory>>({ name: '' });

    const fetchData = useCallback(async () => {
        if (!company?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('sales_request_categories')
                .select('*')
                .eq('company_id', company.id)
                .order('sort_order', { ascending: true });

            if (error) {
                if (error.message.includes('sort_order')) {
                    const { data: fallbackData } = await supabase
                        .from('sales_request_categories')
                        .select('*')
                        .eq('company_id', company.id);
                    if (fallbackData) setCategories(fallbackData as any);
                } else {
                    throw error;
                }
            } else if (data) {
                setCategories(data as any);
            }
        } catch (err) {
            console.error("Error fetching Sales Request categories:", err);
        } finally {
            setLoading(false);
        }
    }, [company.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddClick = () => {
        setForm({ name: '' });
        setIsModalOpen(true);
    };

    const handleEditClick = (cat: SalesRequestCategory) => {
        setForm(cat);
        setIsModalOpen(true);
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!form.name?.trim()) return;

        setIsProcessing(true);
        try {
            const payload = {
                name: form.name.trim(),
                company_id: company.id
            };

            if (form.id) {
                const { error } = await supabase.from('sales_request_categories').update(payload).eq('id', form.id);
                if (error) throw error;
            } else {
                const validOrders = categories.map(c => Number(c.sort_order) || 0);
                const nextOrder = validOrders.length > 0 ? Math.max(...validOrders) + 1 : 1;

                const { error } = await supabase.from('sales_request_categories').insert({
                    ...payload,
                    sort_order: nextOrder
                });
                if (error) throw error;
            }

            setIsModalOpen(false);
            await fetchData();
            window.dispatchEvent(new Event('salesRequestCategoriesUpdated'));
        } catch (err: any) {
            alert("Terjadi kesalahan: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Hapus kategori ini? Seluruh request terkait akan kehilangan kategorinya.")) return;
        setIsProcessing(true);
        try {
            const { error } = await supabase.from('sales_request_categories').delete().eq('id', id);
            if (error) throw error;
            await fetchData();
            window.dispatchEvent(new Event('salesRequestCategoriesUpdated'));
        } catch (err: any) {
            alert("Gagal menghapus: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleMove = async (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === categories.length - 1)) return;

        const newCategories = [...categories];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        const currentOrder = Number(newCategories[index].sort_order) || 0;
        const targetOrder = Number(newCategories[targetIndex].sort_order) || 0;

        newCategories[index].sort_order = targetOrder;
        newCategories[targetIndex].sort_order = currentOrder;

        setCategories([...newCategories].sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0)));
        setIsProcessing(true);

        try {
            await Promise.all([
                supabase.from('sales_request_categories').update({ sort_order: newCategories[index].sort_order }).eq('id', newCategories[index].id),
                supabase.from('sales_request_categories').update({ sort_order: newCategories[targetIndex].sort_order }).eq('id', newCategories[targetIndex].id)
            ]);
            window.dispatchEvent(new Event('salesRequestCategoriesUpdated'));
        } catch (err: any) {
            console.error("Gagal memperbarui urutan:", err);
            fetchData();
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-blue-600" /></div>;

    return (
        <div className="max-w-3xl space-y-8 animate-in fade-in duration-500">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                    <div>
                        <H3 className="text-lg text-gray-900 tracking-tight">Kategori Sales Request</H3>
                        <Subtext className="text-xs text-gray-400 font-medium">Buat kategori request dinamis untuk proses penjualan Anda.</Subtext>
                    </div>
                    <Button
                        onClick={handleAddClick}
                        variant="primary"
                    >
                        <Plus size={14} /> Kategori Baru
                    </Button>
                </div>
                <div className="p-6 space-y-3">
                    {categories.map((cat, idx) => {
                        return (
                            <div key={cat.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl hover:border-blue-200 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="text-gray-300">
                                        <GripVertical size={18} />
                                    </div>
                                    <div className="w-9 h-9 bg-white border border-gray-100 rounded-lg flex items-center justify-center text-blue-600 shadow-sm">
                                        <Tags size={16} />
                                    </div>
                                    <div>
                                        <Label className="text-sm text-gray-700 tracking-tight">{cat.name}</Label>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="flex items-center gap-1 mr-4">
                                        <Button
                                            onClick={() => handleMove(idx, 'up')}
                                            disabled={idx === 0 || isProcessing}
                                            className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600 disabled:opacity-30 transition-all shadow-sm"
                                        >
                                            <ArrowUp size={14} />
                                        </Button>
                                        <Button
                                            onClick={() => handleMove(idx, 'down')}
                                            disabled={idx === categories.length - 1 || isProcessing}
                                            className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600 disabled:opacity-30 transition-all shadow-sm"
                                        >
                                            <ArrowDown size={14} />
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-1 transition-opacity">
                                        <Button onClick={() => handleEditClick(cat)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16} /></Button>
                                        <Button onClick={() => handleDelete(cat.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16} /></Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {categories.length === 0 && (
                        <div className="py-20 text-center text-gray-300">
                            <Tags size={48} className="mx-auto mb-4 opacity-10" />
                            <Subtext className="text-xs uppercase tracking-tight">Belum ada kategori</Subtext>
                        </div>
                    )}
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={form.id ? "Edit Kategori" : "Tambah Kategori Request"}
                footer={
                    <Button
                        onClick={() => handleSave()}
                        disabled={isProcessing || !form.name?.trim()}
                        variant="primary"
                    >
                        {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        Simpan Kategori
                    </Button>
                }
            >
                <div className="space-y-6 py-2">
                    <div className="space-y-2">
                        <Label className="text-[10px] text-gray-400 uppercase tracking-tight ml-1">Nama Kategori Request</Label>
                        <Input
                            type="text"
                            value={form.name || ''}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-md outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner"
                            placeholder="Misal: Request Sampel Produk..."
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
};
