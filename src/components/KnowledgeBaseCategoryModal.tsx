'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, KbCategory } from '@/lib/types';
import { Trash2 } from 'lucide-react';
import { Modal } from '@/components/Modal';

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
    if (!confirm("Hapus kategori?")) return;
    try {
      await supabase.from('kb_categories').delete().eq('id', id);
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
         <form onSubmit={handleSave} className="flex gap-2 pb-4 border-b border-gray-50">
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Nama kategori baru..."
              className="flex-1 bg-gray-50 border border-gray-100 px-5 py-3 rounded-xl text-xs font-bold outline-none focus:bg-white shadow-inner" 
            />
            <button 
              disabled={isProcessing || !name} 
              className="px-6 bg-indigo-600 text-white rounded-xl font-bold text-[10px] uppercase shadow-lg shadow-indigo-100 active:scale-95 transition-all"
            >
              Tambah
            </button>
         </form>
         
         <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 hover:border-indigo-100 transition-all shadow-sm">
                 <span className="text-xs font-bold text-gray-700 uppercase tracking-tight">{cat.name}</span>
                 <button 
                  onClick={() => handleDelete(cat.id)}
                  className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                 >
                   <Trash2 size={16} />
                 </button>
              </div>
            ))}
            {categories.length === 0 && (
              <div className="py-12 text-center">
                 <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em] italic">Belum ada kategori yang dibuat</p>
              </div>
            )}
         </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </Modal>
  );
};
