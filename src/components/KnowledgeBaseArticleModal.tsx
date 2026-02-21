'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, KbCategory, KbArticle } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  categories: KbCategory[];
  article?: KbArticle | null;
  onSuccess: () => void;
}

export const KnowledgeBaseArticleModal: React.FC<Props> = ({ 
  isOpen, onClose, company, categories, article, onSuccess 
}) => {
  const [form, setForm] = useState<Partial<KbArticle>>({
    title: '', content: '', category_id: null
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (article) {
      setForm(article);
    } else {
      setForm({ title: '', content: '', category_id: categories[0]?.id || null });
    }
  }, [article, categories, isOpen]);

  const handleSave = async () => {
    if (!form.title || !form.content) return;
    setIsProcessing(true);
    try {
      if (form.id) {
        await supabase.from('kb_articles').update({
          title: form.title,
          content: form.content,
          category_id: form.category_id
        }).eq('id', form.id);
      } else {
        await supabase.from('kb_articles').insert({
          ...form,
            company_id: company.id
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error saving article:", err);
      alert("Gagal menyimpan artikel");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={form.id ? "Detail Artikel Bantuan" : "Tulis Artikel Baru"}
      size="lg"
      footer={
        <button 
          onClick={handleSave} 
          disabled={isProcessing} 
          className="px-10 py-4 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 active:scale-95 hover:bg-emerald-700 transition-all"
        >
          {isProcessing && <Loader2 className="animate-spin" size={14} />} Simpan Artikel
        </button>
      }
    >
      <div className="space-y-8 py-2">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Judul Artikel*</label>
              <input 
                type="text" 
                value={form.title} 
                onChange={e => setForm({...form, title: e.target.value})} 
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-inner" 
                placeholder="Misal: Cara Konfigurasi Lead..." 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Pilih Kategori</label>
              <select 
                value={form.category_id || ''} 
                onChange={e => setForm({...form, category_id: e.target.value ? Number(e.target.value) : null})} 
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none cursor-pointer focus:bg-white transition-all shadow-inner"
              >
                <option value="">Pilih Kategori</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
         </div>
         <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Isi Artikel / Panduan Lengkap*</label>
            <textarea 
              value={form.content || ''} 
              onChange={e => setForm({...form, content: e.target.value})} 
              className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl font-medium text-xs h-80 outline-none resize-none focus:bg-white focus:border-indigo-500 transition-all shadow-inner leading-relaxed" 
              placeholder="Tuliskan instruksi langkah demi langkah atau detail panduan di sini agar AI dapat mempelajarinya..." 
            />
         </div>
      </div>
    </Modal>
  );
};
