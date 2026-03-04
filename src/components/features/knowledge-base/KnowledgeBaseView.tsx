'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { Button, Table, TableHeader, TableBody, TableRow, TableCell, TableEmpty, H2, Subtext, Label, SearchInput } from '@/components/ui';


import { supabase } from '@/lib/supabase';
import { Company, KbCategory, KbArticle, AiSetting } from '@/lib/types';
import {
  Plus, Search, Edit2, Trash2, Loader2, BookOpen,
  Tags, FileText, Calendar, Eye
} from 'lucide-react';
import { KnowledgeBaseChat } from './KnowledgeBaseChat';
import { KnowledgeBaseArticleModal } from './KnowledgeBaseArticleModal';
import { KnowledgeBaseCategoryModal } from './KnowledgeBaseCategoryModal';
import { useRouter } from 'next/navigation';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';

interface Props {
  company: Company;
}

export const KnowledgeBaseView: React.FC<Props> = ({ company }) => {
  const router = useRouter();
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [categories, setCategories] = useState<KbCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & Chat
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<KbArticle | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, id: number | null, title: string }>({ isOpen: false, id: null, title: '' });

  const [aiSetting, setAiSetting] = useState<AiSetting | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [artRes, catRes, aiRes] = await Promise.all([
        supabase.from('kb_articles').select('*, kb_categories(*)').eq('company_id', company.id).order('created_at', { ascending: false }),
        supabase.from('kb_categories').select('*').eq('company_id', company.id).order('name'),
        supabase.from('ai_settings').select('*').eq('company_id', company.id).maybeSingle()
      ]);

      if (artRes.data) setArticles(artRes.data as any);
      if (catRes.data) setCategories(catRes.data);
      if (aiRes.data) setAiSetting(aiRes.data);
    } finally {
      setLoading(false);
    }
  }, [company.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredArticles = useMemo(() => {
    return articles.filter(a =>
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [articles, searchTerm]);

  const handleDeleteArticle = async (id: number) => {
    setConfirmDelete({ isOpen: false, id: null, title: '' });
    await supabase.from('kb_articles').delete().eq('id', id);
    fetchData();
  };

  const handleOpenArticle = (article: KbArticle) => {
    setSelectedArticle(article);
    setIsArticleModalOpen(true);
  };

  const handleNewArticle = () => {
    setSelectedArticle(null);
    setIsArticleModalOpen(true);
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-blue-600 mb-4" /><Subtext className="text-[10px]  uppercase tracking-tight text-gray-400">Sinkronisasi Basis Pengetahuan...</Subtext></div>;

  return (
    <div className="flex flex-col gap-6 text-gray-900">
      <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <H2 className="text-xl">Knowledge Base</H2>
            <Subtext className="text-[10px] uppercase tracking-tight">Kelola materi panduan dan artikel basis pengetahuan.</Subtext>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsCategoryModalOpen(true)}
              variant="ghost"
              leftIcon={<Tags size={14} strokeWidth={2.5} />}
              className="!px-4 py-2 text-[10px] uppercase tracking-tight text-gray-500 bg-gray-50 border border-gray-100 shadow-none hover:bg-gray-100 rounded-xl"
              size="sm"
            >
              Kelola Kategori
            </Button>
            <Button
              onClick={handleNewArticle}
              leftIcon={<Plus size={14} strokeWidth={3} />}
              className="!px-6 py-2.5 text-[10px] uppercase tracking-tight shadow-lg shadow-blue-100"
              variant="primary"
              size="sm"
            >
              Artikel Baru
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-50">
          <div className="w-[400px] shrink-0">
            <SearchInput
              placeholder="Cari artikel bantuan..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm h-[80vh] mb-4 flex flex-col overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto h-full scrollbar-hide">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader>Artikel & Konten</TableCell>
                <TableCell isHeader>Kategori</TableCell>
                <TableCell isHeader>Tanggal Dibuat</TableCell>
                <TableCell isHeader className="text-center">Aksi</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-50">
              {filteredArticles.map(article => (
                <TableRow key={article.id} className="hover:bg-gray-50/30 group transition-all">
                  <TableCell className="px-8 py-6 max-w-md">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-indigo-100/50">
                        <FileText size={18} />
                      </div>
                      <div className="overflow-hidden">
                        <span className="tracking-tight uppercase font-medium">{article.title}</span>
                        <Subtext className="text-xs text-gray-400 mt-1 line-clamp-1 leading-relaxed italic tracking-tight">
                          {article.content}
                        </Subtext>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-8 py-6">
                    <Label className="px-3 py-1 bg-white border border-indigo-100 rounded-full text-[9px] text-indigo-600 uppercase tracking-tight shadow-sm">
                      {article.kb_categories?.name || 'UMUM'}
                    </Label>
                  </TableCell>
                  <TableCell className="px-8 py-6 text-xs text-gray-500 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar size={12} className="opacity-40" />
                      {new Date(article.created_at || '').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenArticle(article)}
                        className="!p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Baca Artikel"
                      >
                        <Eye size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenArticle(article)}
                        className="!p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Artikel"
                      >
                        <Edit2 size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDelete({ isOpen: true, id: article.id, title: article.title })}
                        className="!p-2 text-rose-700 !bg-transparent hover:!bg-rose-50 shadow-none hover:border-rose-200 transition-all border border-transparent rounded-lg"
                        title="Hapus Artikel"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredArticles.length === 0 && (
                <TableRow>
                  <TableCell className="text-center py-32">
                    <TableEmpty
                      colSpan={4}
                      icon={<BookOpen size={32} />}
                      message="Basis pengetahuan belum tersedia"
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <KnowledgeBaseChat
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(prev => !prev)}
          articles={articles}
          aiSetting={aiSetting}
          onNavigate={(path) => router.push(path)}
          onOpenArticle={handleOpenArticle}
        />

        {isArticleModalOpen && (
          <KnowledgeBaseArticleModal
            isOpen={isArticleModalOpen}
            onClose={() => setIsArticleModalOpen(false)}
            company={company}
            categories={categories}
            article={selectedArticle}
            onSuccess={fetchData}
          />
        )}

        {isCategoryModalOpen && (
          <KnowledgeBaseCategoryModal
            isOpen={isCategoryModalOpen}
            onClose={() => setIsCategoryModalOpen(false)}
            company={company}
            categories={categories}
            onSuccess={fetchData}
          />
        )}

        <ConfirmDeleteModal
          isOpen={confirmDelete.isOpen}
          onClose={() => setConfirmDelete({ isOpen: false, id: null, title: '' })}
          onConfirm={() => {
            if (confirmDelete.id) {
              handleDeleteArticle(confirmDelete.id);
            }
          }}
          title="Hapus Artikel"
          itemName={confirmDelete.title}
          description="Apakah Anda yakin ingin menghapus artikel ini dari basis pengetahuan?"
        />
      </div>
    </div>
  );
};
