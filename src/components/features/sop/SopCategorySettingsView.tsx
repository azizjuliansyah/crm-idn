'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Input, Button, H2, Subtext, Label, Modal, ComboBox, Toast, ToastType } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { SopCategory, Company } from '@/lib/types';
import {
  Loader2, Plus, CornerDownRight, GripVertical,
  Tags, ArrowUp, ArrowDown, Edit2, Trash2, Save
} from 'lucide-react';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';

interface Props {
  company: Company;
}

export const SopCategorySettingsView: React.FC<Props> = ({ company }) => {
  const [categories, setCategories] = useState<SopCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [form, setForm] = useState<Partial<SopCategory>>({ name: '', parent_id: null });
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
    isOpen: false,
    message: '',
    type: 'success',
  });
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, id: number | null }>({
    isOpen: false,
    id: null
  });

  const fetchData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sop_categories')
        .select('*')
        .eq('company_id', company.id)
        .order('sort_order', { ascending: true });

      if (error) {
        if (error.message.includes('sort_order')) {
          const { data: fallbackData } = await supabase
            .from('sop_categories')
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
      console.error("Error fetching SOP categories:", err);
    } finally {
      setLoading(false);
    }
  }, [company.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddClick = () => {
    setForm({ name: '', parent_id: null });
    setIsModalOpen(true);
  };

  const handleEditClick = (cat: SopCategory) => {
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
        parent_id: form.parent_id || null,
        company_id: company.id
      };

      if (form.id) {
        const { error } = await supabase.from('sop_categories').update(payload).eq('id', form.id);
        if (error) throw error;
      } else {
        const validOrders = categories.map(c => Number(c.sort_order) || 0);
        const nextOrder = validOrders.length > 0 ? Math.max(...validOrders) + 1 : 1;

        const { error } = await supabase.from('sop_categories').insert({
          ...payload,
          sort_order: nextOrder
        });
        if (error) throw error;
      }

      setIsModalOpen(false);
      await fetchData();
      setToast({ isOpen: true, message: 'Kategori berhasil disimpan', type: 'success' });
      window.dispatchEvent(new Event('sopCategoriesUpdated'));
    } catch (err: any) {
      setToast({ isOpen: true, message: "Terjadi kesalahan: " + err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete.id) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('sop_categories').delete().eq('id', confirmDelete.id);
      if (error) throw error;
      setConfirmDelete({ isOpen: false, id: null });
      await fetchData();
      setToast({ isOpen: true, message: 'Kategori berhasil dihapus', type: 'success' });
      window.dispatchEvent(new Event('sopCategoriesUpdated'));
    } catch (err: any) {
      setToast({ isOpen: true, message: "Gagal menghapus: " + err.message, type: 'error' });
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
        supabase.from('sop_categories').update({ sort_order: newCategories[index].sort_order }).eq('id', newCategories[index].id),
        supabase.from('sop_categories').update({ sort_order: newCategories[targetIndex].sort_order }).eq('id', newCategories[targetIndex].id)
      ]);
      window.dispatchEvent(new Event('sopCategoriesUpdated'));
    } catch (err: any) {
      console.error("Gagal memperbarui urutan:", err);
      fetchData();
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper untuk mendapatkan nama induk
  const getParentName = (parentId: number | null) => {
    if (!parentId) return null;
    return categories.find(c => c.id === parentId)?.name;
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-4xl flex flex-col space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div>
          <H2 className="text-xl ">Kategori SOP</H2>
          <Subtext className="text-[10px] uppercase font-semibold text-gray-400">Atur klasifikasi utama dan sub-kategori prosedur operasional standar.</Subtext>
        </div>
        <Button
          onClick={handleAddClick}
          leftIcon={<Plus size={14} strokeWidth={3} />}
          variant='primary'
          size='sm'
        >
          Kategori Baru
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6 space-y-3">
        {categories.map((cat, idx) => {
          const hasParent = !!cat.parent_id;
          return (
            <div key={cat.id} className={`flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl hover:border-blue-200 transition-all group ${hasParent ? 'ml-10 border-dashed bg-white' : ''}`}>
              <div className="flex items-center gap-4">
                <div className="text-gray-300">
                  {hasParent ? <CornerDownRight size={16} className="text-blue-400" /> : <GripVertical size={18} />}
                </div>
                <div className={`w-9 h-9 bg-white border border-gray-100 rounded-lg flex items-center justify-center text-blue-600 shadow-sm ${hasParent ? 'w-7 h-7' : ''}`}>
                  <Tags size={hasParent ? 12 : 16} />
                </div>
                <div>
                  <Label className={`  ${hasParent ? 'text-xs text-gray-500' : 'text-sm text-gray-700'}`}>{cat.name}</Label>
                  {hasParent && (
                    <Subtext className="text-[8px]  text-blue-400 uppercase  mt-0.5">Sub dari: {getParentName(cat.parent_id)}</Subtext>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!hasParent && (
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
                      disabled={idx === categories.length - 1 || isProcessing}
                    />
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <ActionButton icon={Edit2} variant="blue" onClick={() => handleEditClick(cat)} />
                  <ActionButton icon={Trash2} variant="rose" onClick={() => setConfirmDelete({ isOpen: true, id: cat.id })} />
                </div>
              </div>
            </div>
          );
        })}
        {categories.length === 0 && (
          <div className="py-20 text-center text-gray-300">
            <Tags size={48} className="mx-auto mb-4 opacity-10" />
            <Subtext className="text-xs  uppercase ">Belum ada kategori</Subtext>
          </div>
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        onConfirm={handleDelete}
        title="Hapus Kategori SOP"
        itemName="Kategori ini"
        description="Seluruh SOP terkait akan kehilangan kategorinya. Tindakan ini tidak dapat dibatalkan."
        isProcessing={isProcessing}
        variant="horizontal"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={form.id ? "Edit Kategori" : "Tambah Kategori SOP"}
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
            <Label className="text-[10px]  text-gray-400 uppercase  ml-1">Nama Kategori / Divisi</Label>
            <Input
              type="text"
              value={form.name || ''}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-md  outline-none focus:bg-white focus:border-blue-500 transition-all"
              placeholder="Misal: Departemen Keuangan..."
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px]  text-gray-400 uppercase  ml-1">Induk Kategori (Opsional)</Label>
            <ComboBox
              value={form.parent_id || ''}
              onChange={(val: string | number) => setForm({ ...form, parent_id: val ? Number(val) : null })}
              options={[
                { value: '', label: '-- Tanpa Induk (Kategori Utama) --' },
                ...categories
                  .filter(c => !c.parent_id && c.id !== form.id) // Hindari sirkular dan nesting lebih dari 2 level
                  .map(c => ({ value: c.id.toString(), label: c.name }))
              ]}
              hideSearch={true}
              className="w-full"
            />
            <Subtext className="text-[9px] text-gray-400 italic px-1">Pilih induk jika kategori ini merupakan bagian dari divisi/departemen lain.</Subtext>
          </div>
        </div>
      </Modal>

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
