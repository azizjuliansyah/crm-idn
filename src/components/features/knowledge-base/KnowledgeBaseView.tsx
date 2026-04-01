'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { Button, Table, TableHeader, TableBody, TableRow, TableCell, TableEmpty, H2, Subtext, Label, SearchInput } from '@/components/ui';
import { useAppStore } from '@/lib/store/useAppStore';

import { supabase } from '@/lib/supabase';
import { Company, KbCategory, KbArticle, AiSetting } from '@/lib/types';
import {
  Plus, Edit2, Trash2, Loader2, BookOpen,
  Tags, FileText, Eye
} from 'lucide-react';
import { KnowledgeBaseChat } from './KnowledgeBaseChat';
import { KnowledgeBaseArticleModal } from './KnowledgeBaseArticleModal';
import { KnowledgeBaseCategoryModal } from './KnowledgeBaseCategoryModal';
import { useRouter } from 'next/navigation';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { ActionButton } from '@/components/shared/buttons/ActionButton';

interface Props {
  company: Company;
}

export const KnowledgeBaseView: React.FC<Props> = ({ company }) => {
  const router = useRouter();
  const { showToast } = useAppStore();
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

      if (artRes.error) throw artRes.error;
      if (catRes.error) throw catRes.error;

      if (artRes.data) setArticles(artRes.data as any);
      if (catRes.data) setCategories(catRes.data);
      if (aiRes.data) setAiSetting(aiRes.data);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [company.id, showToast]);

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
    try {
      setConfirmDelete({ isOpen: false, id: null, title: '' });
      const { error } = await supabase.from('kb_articles').delete().eq('id', id);
      if (error) throw error;
      showToast('Artikel telah dihapus.', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenArticle = (article: KbArticle) => {
    setSelectedArticle(article);
    setIsArticleModalOpen(true);
  };

  const handleNewArticle = () => {
    setSelectedArticle(null);
    setIsArticleModalOpen(true);
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-blue-600 mb-4" /><Subtext className="text-[10px]  uppercase  text-gray-400">Sinkronisasi Basis Pengetahuan...</Subtext></div>;

  return (
    <div className="flex flex-col gap-6 text-gray-900">
      <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <H2 className="text-xl">Knowledge Base</H2>
            <Subtext className="text-[10px] uppercase ">Kelola materi panduan dan artikel basis pengetahuan.</Subtext>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsCategoryModalOpen(true)}
              variant="ghost"
              leftIcon={<Tags size={14} strokeWidth={2.5} />}
              className="!px-4 py-2 text-[10px] uppercase  text-gray-500 bg-gray-50 border border-gray-100 shadow-none hover:bg-gray-100 rounded-xl"
              size="sm"
            >
              Kelola Kategori
            </Button>
            <Button
              onClick={handleNewArticle}
              leftIcon={<Plus size={14} strokeWidth={3} />}
              className="!px-6 py-2.5 text-[10px] uppercase  shadow-lg shadow-blue-100"
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
                <TableCell isHeader className="w-20">ID</TableCell>
                <TableCell isHeader>Artikel & Konten</TableCell>
                <TableCell isHeader>Kategori</TableCell>
                <TableCell isHeader className="text-center">Aksi</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-50">
              {filteredArticles.map(article => (
                <TableRow key={article.id} className="hover:bg-gray-50/30 group transition-all">
                  <TableCell className="py-5 px-6">
                    #{article.id}
                  </TableCell>
                  <TableCell className="py-5 px-6 max-w-md">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-indigo-100/50">
                        <FileText size={20} strokeWidth={2.5} />
                      </div>
                      <div className="overflow-hidden">
                        <Subtext className="text-sm text-gray-900 font-medium ">{article.title}</Subtext>
                        <Subtext className="!text-[10px] text-gray-400  uppercase  italic line-clamp-1">
                          {article.content}
                        </Subtext>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-8 py-6">
                    <Label className="px-3 py-1 bg-white border border-indigo-100 rounded-full text-[9px] text-indigo-600 uppercase  shadow-sm">
                      {article.kb_categories?.name || 'UMUM'}
                    </Label>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <ActionButton
                        icon={Eye}
                        variant="emerald"
                        onClick={() => handleOpenArticle(article)}
                        title="Baca Artikel"
                      />
                      <ActionButton
                        icon={Edit2}
                        variant="blue"
                        onClick={() => handleOpenArticle(article)}
                        title="Edit Artikel"
                      />
                      <ActionButton
                        icon={Trash2}
                        variant="rose"
                        onClick={() => setConfirmDelete({ isOpen: true, id: article.id, title: article.title })}
                        title="Hapus Artikel"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredArticles.length === 0 && (
                <TableRow>
                  <TableCell className="text-center py-32">
                    <TableEmpty
                      colSpan={5}
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
          variant="horizontal"
        />
      </div>
    </div>
  );
};
