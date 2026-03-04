'use client';

import React, { useState, useEffect } from 'react';

import { Input, Textarea, Button, Modal, ComboBox } from '@/components/ui';


import { supabase } from '@/lib/supabase';
import { Company, KbCategory, KbArticle } from '@/lib/types';
import { Loader2, Save } from 'lucide-react';

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
        <Button
          onClick={handleSave}
          disabled={isProcessing}
          isLoading={isProcessing}
          leftIcon={<Save size={14} />}
          variant="success"
        >
          Simpan Artikel
        </Button>
      }
    >
      <div className="space-y-8 py-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Judul Artikel*"
            type="text"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Misal: Cara Konfigurasi Lead..."
          />
          <ComboBox
            label="Pilih Kategori"
            value={form.category_id || ''}
            onChange={(val: string | number) => setForm({ ...form, category_id: val ? Number(val) : null })}
            options={[
              // { value: '', label: 'Pilih Kategori' },
              ...categories.map(c => ({ value: c.id.toString(), label: c.name }))
            ]}
          />
        </div>
        <Textarea
          label="Isi Artikel / Panduan Lengkap*"
          value={form.content || ''}
          onChange={e => setForm({ ...form, content: e.target.value })}
          className="h-80 resize-none"
          placeholder="Tuliskan instruksi langkah demi langkah atau detail panduan di sini agar AI dapat mempelajarinya..."
        />
      </div>
    </Modal>
  );
};
