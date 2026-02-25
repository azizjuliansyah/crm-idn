'use client';

import React, { useState } from 'react';

import { Input, Button, Subtext, Label, Modal } from '@/components/ui';


import { supabase } from '@/lib/supabase';
import { Company, KbCategory } from '@/lib/types';
import { Trash2 } from 'lucide-react';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  categories: KbCategory[];
  onSuccess: () => void;
}

export const KnowledgeBaseCategoryModal: React.FC<Props> = ({ 
  isOpen, onClose, company, categories, onSuccess 
}) => {
  const [name, setName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{isOpen: boolean, id: number | null}>({ isOpen: false, id: null });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setIsProcessing(true);
    try {
      await supabase.from('kb_categories').insert({ name, company_id: company.id });
      setName('');
      onSuccess();
    } catch (err) {
       console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await supabase.from('kb_categories').delete().eq('id', id);
      setConfirmDelete({ isOpen: false, id: null });
      onSuccess();
    } catch (err) {
      console.error(err);
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
              className="px-6 h-[42px] bg-indigo-600 text-white rounded-xl  text-[10px] uppercase shadow-lg shadow-indigo-100 active:scale-95 transition-all"
            >
              Tambah
            </Button>
         </form>
         
         <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 hover:border-indigo-100 transition-all shadow-sm">
                 <Label className="text-xs  text-gray-700 uppercase tracking-tight">{cat.name}</Label>
                 <Button 
                  onClick={() => setConfirmDelete({ isOpen: true, id: cat.id })}
                  className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                 >
                   <Trash2 size={16} />
                 </Button>
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
      />
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </Modal>
  );
};
