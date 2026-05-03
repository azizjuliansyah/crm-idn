'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Input, Button, H2, Subtext, Label, Modal } from '@/components/ui';
import { useAppStore } from '@/lib/store/useAppStore';
import { supabase } from '@/lib/supabase';
import { UrgencyLevel, Company } from '@/lib/types';
import {
    Loader2, Plus, GripVertical,
    AlertTriangle, ArrowUp, ArrowDown, Edit2, Trash2, Save
} from 'lucide-react';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';

interface Props {
    company: Company;
}

const COLOR_OPTIONS = [
    { name: 'Gray', value: 'gray', bgClass: 'bg-gray-100', textClass: 'text-gray-600', borderClass: 'border-gray-200' },
    { name: 'Slate', value: 'slate', bgClass: 'bg-slate-100', textClass: 'text-slate-600', borderClass: 'border-slate-200' },
    { name: 'Blue', value: 'blue', bgClass: 'bg-blue-100', textClass: 'text-blue-600', borderClass: 'border-blue-200' },
    { name: 'Indigo', value: 'indigo', bgClass: 'bg-indigo-100', textClass: 'text-indigo-600', borderClass: 'border-indigo-200' },
    { name: 'Purple', value: 'purple', bgClass: 'bg-purple-100', textClass: 'text-purple-600', borderClass: 'border-purple-200' },
    { name: 'Emerald', value: 'emerald', bgClass: 'bg-emerald-100', textClass: 'text-emerald-600', borderClass: 'border-emerald-200' },
    { name: 'Green', value: 'green', bgClass: 'bg-green-100', textClass: 'text-green-600', borderClass: 'border-green-200' },
    { name: 'Amber', value: 'amber', bgClass: 'bg-amber-100', textClass: 'text-amber-600', borderClass: 'border-amber-200' },
    { name: 'Orange', value: 'orange', bgClass: 'bg-orange-100', textClass: 'text-orange-600', borderClass: 'border-orange-200' },
    { name: 'Rose', value: 'rose', bgClass: 'bg-rose-100', textClass: 'text-rose-600', borderClass: 'border-rose-200' },
    { name: 'Red', value: 'red', bgClass: 'bg-red-100', textClass: 'text-red-600', borderClass: 'border-red-200' },
];

export const UrgencyLevelsSettingsView: React.FC<Props> = ({ company }) => {
    const { showToast } = useAppStore();
    const [urgencies, setUrgencies] = useState<UrgencyLevel[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [form, setForm] = useState<Partial<UrgencyLevel>>({ name: '', color: 'gray' });
    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null; name: string }>({ isOpen: false, id: null, name: '' });
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

    const fetchData = useCallback(async () => {
        if (!company?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('urgency_levels')
                .select('*')
                .eq('company_id', company.id)
                .order('sort_order', { ascending: true });

            if (error) {
                if (error.code === '42P01') {
                     console.log('relation "urgency_levels" does not exist yet. Please run migration.');
                } else {
                    throw error;
                }
            } else if (data) {
                setUrgencies(data as any);
            }
        } catch (err: any) {
            showToast("Error fetching urgency levels: " + err.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [company.id, showToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddClick = () => {
        setForm({ name: '', color: 'gray' });
        setIsModalOpen(true);
    };

    const handleEditClick = (urgency: UrgencyLevel) => {
        setForm(urgency);
        setIsModalOpen(true);
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!form.name?.trim()) return;

        setIsProcessing(true);
        try {
            const payload = {
                name: form.name.trim(),
                company_id: company.id,
                color: form.color || 'gray'
            };

            if (form.id) {
                const { error } = await supabase.from('urgency_levels').update(payload).eq('id', form.id);
                if (error) throw error;
            } else {
                const validOrders = urgencies.map(u => Number(u.sort_order) || 0);
                const nextOrder = validOrders.length > 0 ? Math.max(...validOrders) + 1 : 1;

                const { error } = await supabase.from('urgency_levels').insert({
                    ...payload,
                    sort_order: nextOrder
                });
                if (error) throw error;
            }

            setIsModalOpen(false);
            showToast(`Tingkat Urgensi ${form.id ? 'diperbarui' : 'dibuat'}`, 'success');
            await fetchData();
            window.dispatchEvent(new Event('urgencyLevelsUpdated'));
        } catch (err: any) {
             if (err.code === '42P01') {
                 showToast('Tabel urgency_levels belum ada, silakan jalankan migrasi database.', 'error');
             } else {
                 showToast(err.message, 'error');
             }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = (urgency: UrgencyLevel) => {
        setConfirmDelete({ isOpen: true, id: urgency.id, name: urgency.name });
    };

    const executeDelete = async () => {
        if (!confirmDelete.id) return;
        setIsProcessing(true);
        try {
            const { error } = await supabase.from('urgency_levels').delete().eq('id', confirmDelete.id);
            if (error) throw error;
            setConfirmDelete({ isOpen: false, id: null, name: '' });
            showToast(`Urgensi ${confirmDelete.name} dihapus`, 'success');
            await fetchData();
            window.dispatchEvent(new Event('urgencyLevelsUpdated'));
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleMove = async (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === urgencies.length - 1)) return;

        const newUrgencies = [...urgencies];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        const currentOrder = Number(newUrgencies[index].sort_order) || 0;
        const targetOrder = Number(newUrgencies[targetIndex].sort_order) || 0;

        newUrgencies[index].sort_order = targetOrder;
        newUrgencies[targetIndex].sort_order = currentOrder;

        setUrgencies([...newUrgencies].sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0)));
        setIsProcessing(true);

        try {
            await Promise.all([
                supabase.from('urgency_levels').update({ sort_order: newUrgencies[index].sort_order }).eq('id', newUrgencies[index].id),
                supabase.from('urgency_levels').update({ sort_order: newUrgencies[targetIndex].sort_order }).eq('id', newUrgencies[targetIndex].id)
            ]);
            window.dispatchEvent(new Event('urgencyLevelsUpdated'));
        } catch (err: any) {
            console.error("Gagal memperbarui urutan:", err);
            fetchData();
        } finally {
            setIsProcessing(false);
        }
    };
    
    const getColorClasses = (colorName: string) => {
        const option = COLOR_OPTIONS.find(c => c.value === colorName) || COLOR_OPTIONS[0];
        return `${option.bgClass} ${option.textClass} ${option.borderClass}`;
    };

    if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-blue-600" /></div>;

    return (
        <div className="max-w-4xl flex flex-col space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border-2 border-gray-300 shadow-none shrink-0">
                <div>
                    <H2 className="text-xl ">Tingkat Urgensi</H2>
                    <Subtext className="text-[10px] uppercase font-semibold text-gray-400">Atur prioritas status untuk Request yang dinamis.</Subtext>
                </div>
                <Button
                    onClick={handleAddClick}
                    leftIcon={<Plus size={14} strokeWidth={3} />}
                    className="!px-6 py-2.5 text-[10px] uppercase shadow-none"
                    variant='primary'
                    size='sm'
                >
                    Urgensi Baru
                </Button>
            </div>

            <div className="bg-white rounded-2xl border-2 border-gray-300 shadow-none overflow-hidden p-6 space-y-3">
                {urgencies.map((u, idx) => {
                    return (
                        <div key={u.id} className="flex items-center justify-between p-4 bg-gray-50 border-2 border-gray-300 rounded-xl hover:border-blue-500 transition-all group shadow-none">
                            <div className="flex items-center gap-4">
                                <div className="text-gray-300">
                                    <GripVertical size={18} />
                                </div>
                                <div className={`w-9 h-9 border-2 rounded-lg flex items-center justify-center shadow-none ${getColorClasses(u.color || 'gray')}`}>
                                    <AlertTriangle size={16} />
                                </div>
                                <div>
                                    <Label className="text-sm text-gray-700 ">{u.name}</Label>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="flex items-center gap-1 border-r border-gray-100 pr-3 mr-3">
                                    <ActionButton
                                        icon={ArrowUp}
                                        variant="gray"
                                        onClick={() => handleMove(idx, 'up')}
                                        disabled={idx === 0 || isProcessing}
                                    />
                                    <ActionButton
                                        icon={ArrowDown}
                                        variant="gray"
                                        onClick={() => handleMove(idx, 'down')}
                                        disabled={idx === urgencies.length - 1 || isProcessing}
                                    />
                                </div>
                                <div className="flex items-center gap-1">
                                    <ActionButton icon={Edit2} variant="blue" onClick={() => handleEditClick(u)} />
                                    <ActionButton icon={Trash2} variant="rose" onClick={() => handleDelete(u)} />
                                </div>
                            </div>
                        </div>
                    );
                })}
                {urgencies.length === 0 && (
                    <div className="py-20 text-center text-gray-300">
                        <AlertTriangle size={48} className="mx-auto mb-4 opacity-10" />
                        <Subtext className="text-xs uppercase ">Belum ada tingkat urgensi</Subtext>
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={form.id ? "Edit Urgensi" : "Tambah Urgensi"}
                footer={
                    <div className="flex items-center justify-end gap-3 w-full">
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isProcessing} className="rounded-md">
                            Batal
                        </Button>
                        <Button
                            onClick={() => handleSave()}
                            disabled={isProcessing || !form.name?.trim()}
                            variant="primary"
                            className="rounded-md"
                        >
                            {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            Simpan Urgensi
                        </Button>
                    </div>
                }
            >
                <div className="space-y-6 py-2 pb-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] text-gray-400 uppercase ml-1">Nama Tingkat Urgensi</Label>
                        <Input
                            type="text"
                            value={form.name || ''}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-md outline-none focus:bg-white focus:border-blue-500 transition-all"
                            placeholder="Misal: Urgent, Normal..."
                        />
                    </div>
                    
                    <div className="space-y-2 relative">
                        <Label className="text-[10px] text-gray-400 uppercase ml-1">Warna Label</Label>
                        <div className="relative">
                            <button 
                                type="button"
                                onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                                className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 border border-gray-100 rounded-md outline-none focus:bg-white focus:border-blue-500 transition-all cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-md border ${getColorClasses(form.color || 'gray')}`} />
                                    <span className="text-sm font-medium text-gray-700">{COLOR_OPTIONS.find(c => c.value === (form.color || 'gray'))?.name || 'Gray'}</span>
                                </div>
                            </button>
                            
                            {isColorPickerOpen && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-10 cursor-pointer" 
                                        onClick={() => setIsColorPickerOpen(false)}
                                    />
                                    <div className="absolute z-20 w-full mt-2 bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden p-2 grid grid-cols-4 gap-2">
                                        {COLOR_OPTIONS.map((color) => (
                                            <button
                                                key={color.value}
                                                type="button"
                                                className={`flex flex-col items-center justify-center p-3 rounded-lg border hover:border-blue-300 transition-all ${form.color === color.value ? 'bg-blue-50 border-blue-400' : 'border-transparent hover:bg-gray-50'}`}
                                                onClick={() => {
                                                    setForm({ ...form, color: color.value });
                                                    setIsColorPickerOpen(false);
                                                }}
                                            >
                                                <div className={`w-8 h-8 rounded-full border mb-2 ${color.bgClass} ${color.borderClass}`} />
                                                <span className="text-[10px] font-medium text-gray-600 uppercase">{color.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                </div>
            </Modal>

            <ConfirmDeleteModal
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
                onConfirm={executeDelete}
                title="Hapus Urgensi"
                itemName={confirmDelete.name}
                description="Hapus tingkat urgensi ini? Request yang menggunakan urgensi ini mungkin akan kehilangan labelnya."
                isProcessing={isProcessing}
            />
        </div>
    );
};
