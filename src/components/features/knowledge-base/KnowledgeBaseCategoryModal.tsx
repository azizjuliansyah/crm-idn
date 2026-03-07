'use client';

import React, { useState } from 'react';

import { Input, Button, Subtext, Label, Modal, ToastType } from '@/components/ui';


import { supabase } from '@/lib/supabase';
import { Company, KbCategory } from '@/lib/types';
import { Trash2 } from 'lucide-react';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { ActionButton } from '@/components/shared/buttons/ActionButton';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  categories: KbCategory[];
  onSuccess: () => void;
  setToast: (toast: { isOpen: boolean; message: string; type: ToastType }) => void;
}

export const KnowledgeBaseCategoryModal: React.FC<Props> = ({
  isOpen, onClose, company, categories, onSuccess, setToast
}) => {
  const [name, setName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, id: number | null }>({ isOpen: false, id: null });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setIsProcessing(true);
    try {
      await supabase.from('kb_categories').insert({ name, company_id: company.id });
      setName('');
      onSuccess();
      setToast({ isOpen: true, message: 'Kategori berhasil ditambahkan!', type: 'success' });
    } catch (err: any) {
      setToast({ isOpen: true, message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await supabase.from('kb_categories').delete().eq('id', id);
      setConfirmDelete({ isOpen: false, id: null });
      onSuccess();
      setToast({ isOpen: true, message: 'Kategori telah dihapus.', type: 'success' });
    } catch (err: any) {
      setToast({ isOpen: true, message: err.message, type: 'error' });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manajemen Kategori Artikel"
      size="md"
    >
      <div className="space-y-6">
        <form onSubmit={handleSave} className="flex gap-2 pb-4 border-b border-gray-50 items-end">
          <div className="flex-1">
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nama kategori baru..."
            />
          </div>
          <Button
            type="submit"
            disabled={isProcessing || !name}
            isLoading={isProcessing}
            variant='primary'
          >
            Tambah
          </Button>
        </form>

        <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-2">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between py-2 px-3 bg-white rounded-2xl border border-gray-300">
              <Label className="text-xs  text-gray-700 uppercase ">{cat.name}</Label>
              <ActionButton
                icon={Trash2}
                variant="rose"
                onClick={() => setConfirmDelete({ isOpen: true, id: cat.id })}
                title="Hapus Kategori"
              />
            </div>
          ))}
          {categories.length === 0 && (
            <div className="py-12 text-center">
              <Subtext className="text-[10px]  text-gray-300 uppercase tracking-[0.2em] italic">Belum ada kategori yang dibuat</Subtext>
            </div>
          )}
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        onConfirm={() => {
          if (confirmDelete.id) {
            handleDelete(confirmDelete.id);
          }
        }}
        title="Hapus Kategori"
        itemName="Kategori ini"
        variant="horizontal"
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </Modal>
  );
};
