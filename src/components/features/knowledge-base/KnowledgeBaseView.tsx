'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { 
  Button, 
  H2, 
  Subtext, 
  ComboBox, 
  Badge, 
  SearchInput,
} from '@/components/ui';
import { Loader2 as LoaderIcon } from 'lucide-react';
import { useAppStore } from '@/lib/store/useAppStore';

import { supabase } from '@/lib/supabase';
import { Company, KbArticle as KnowledgeBaseArticle, KbCategory as KnowledgeBaseCategory, AiSetting } from '@/lib/types';
import {
  Plus, Book, MessageSquare,
  ChevronRight, Tag, Clock, Newspaper,
  Settings, Edit, Trash2
} from 'lucide-react';
import { ConfirmBulkDeleteModal } from '@/components/shared/modals/ConfirmBulkDeleteModal';
import { KnowledgeBaseArticleModal } from './KnowledgeBaseArticleModal';
import { KnowledgeBaseCategoryModal } from './KnowledgeBaseCategoryModal';
import { KnowledgeBaseChat } from './KnowledgeBaseChat';
import { useKnowledgeBaseQuery, useKnowledgeBaseMutations } from '@/lib/hooks/useKnowledgeBaseQuery';
import { useKnowledgeBaseFilters, KbSortKey } from '@/lib/hooks/useKnowledgeBaseFilters';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { StandardFilterBar } from '@/components/shared/filters/StandardFilterBar';
import { BulkActionGroup } from '@/components/shared/filters/BulkActionGroup';
import { BaseDataTable, ColumnConfig } from '@/components/shared/tables/BaseDataTable';

interface Props {
  activeCompany: Company;
}

export const KnowledgeBaseView: React.FC<Props> = ({ activeCompany: company }) => {
  const { showToast } = useAppStore();
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const filters = useKnowledgeBaseFilters();

  const [categories, setCategories] = useState<KnowledgeBaseCategory[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'chat'>('list');
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeBaseArticle | null>(null);
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isConfirmBulkDeleteOpen, setIsConfirmBulkDeleteOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [settings, setSettings] = useState<AiSetting | null>(null);

  const {
    data: articlesData,
    isLoading: loadingArticles,
    refetch: refetchArticles
  } = useKnowledgeBaseQuery({
    companyId: String(company?.id || ''),
    searchTerm: filters.searchTerm,
    filterCategoryId: filters.filterCategoryId,
    sortConfig: filters.sortConfig,
    page,
    pageSize,
  });

  const articles = articlesData?.data || [];

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('kb_categories')
        .select('*')
        .eq('company_id', company.id)
        .order('name');

      if (error) throw error;
      if (data) setCategories(data);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }, [company.id, showToast]);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('ai_settings')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();
      setSettings(data);
    };
    fetchSettings();
    fetchCategories();
  }, [company.id, fetchCategories]);

  // Reset page to 1 on filter/search change
  useEffect(() => {
    setPage(1);
  }, [filters.searchTerm, filters.filterCategoryId]);

  const handleCreateArticle = () => {
    setSelectedArticle(null);
    setIsArticleModalOpen(true);
  };
  const handleEditArticle = (article: KnowledgeBaseArticle) => {
    setSelectedArticle(article);
    setIsArticleModalOpen(true);
  };

  const { bulkDeleteArticles } = useKnowledgeBaseMutations();

  const handleToggleSelect = (id: string | number) => {
    const numId = Number(id);
    setSelectedIds(prev =>
      prev.includes(numId) ? prev.filter(i => i !== numId) : [...prev, numId]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === articles.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(articles.map(article => article.id));
    }
  };

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteArticles.mutateAsync(selectedIds);
      showToast(`${selectedIds.length} artikel berhasil dihapus.`, 'success');
      setSelectedIds([]);
      setIsConfirmBulkDeleteOpen(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const columns: ColumnConfig<KnowledgeBaseArticle>[] = useMemo(() => [
    {
      header: '',
      key: 'id' as any,
      className: 'pl-6 w-12',
      render: () => (
        <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
          <Book size={14} />
        </div>
      )
    },
    {
      header: 'Judul Artikel',
      key: 'title' as KbSortKey,
      sortable: true,
      className: 'min-w-[250px]',
      render: (article: KnowledgeBaseArticle) => (
        <span className="text-sm font-bold text-gray-900 uppercase group-hover:text-blue-600 transition-colors">
          {article.title}
        </span>
      )
    },
    {
      header: 'Kategori',
      key: 'category_id' as KbSortKey,
      sortable: true,
      className: 'w-40',
      render: (article: KnowledgeBaseArticle) => (
        <Badge variant="sky" className="text-[9px] uppercase px-2 py-0.5 rounded-full font-bold">
          {(article as any).category?.name || 'General'}
        </Badge>
      )
    },
    {
      header: 'Snippet Konten',
      key: 'content' as any,
      className: 'min-w-[300px]',
      render: (article: KnowledgeBaseArticle) => (
        <p className="text-[11px] text-gray-500 line-clamp-1 leading-relaxed opacity-50 group-hover:opacity-100 transition-opacity">
          {article.content.replace(/[#*`]/g, '')}
        </p>
      )
    },
    {
      header: 'Tanggal',
      key: 'created_at' as KbSortKey,
      sortable: true,
      className: 'w-32',
      render: (article: KnowledgeBaseArticle) => (
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 uppercase font-medium">
          <Clock size={12} className="opacity-50" />
          {new Date(article.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
        </div>
      )
    },
    {
      header: 'Aksi',
      key: 'actions' as any,
      className: 'pr-6 text-right w-16',
      render: (article: KnowledgeBaseArticle) => (
        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
          <ActionButton
            icon={Edit}
            variant="blue"
            title="Edit Artikel"
            onClick={(e) => {
              e.stopPropagation();
              handleEditArticle(article);
            }}
          />
        </div>
      )
    }
  ], []);

  if (viewMode === 'chat') {
    return (
      <div className="h-[calc(100vh-140px)] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => setViewMode('list')} leftIcon={<ChevronRight className="rotate-180" size={16} />}>
            Kembali ke Daftar
          </Button>
          <H2 className="text-xl">Knowledge Assistant</H2>
        </div>
        <KnowledgeBaseChat 
          isOpen={true}
          onClose={() => setViewMode('list')}
          articles={articles}
          aiSetting={settings}
          onOpenArticle={handleEditArticle}
        />
      </div>
    );
  }

  if (loadingArticles && articles.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-100 min-h-[400px]">
      <LoaderIcon className="animate-spin text-blue-600 mb-4" size={32} />
      <Subtext className="text-[10px] uppercase text-gray-400">Sinkronisasi Artikel...</Subtext>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 text-gray-900">
      <StandardFilterBar
        title="Knowledge Base"
        subtitle="Pusat informasi, panduan, dan dokumentasi internal."
        searchTerm={filters.searchTerm}
        onSearchChange={filters.setSearchTerm}
        searchPlaceholder="Cari artikel atau tutorial..."
        primaryAction={{
          label: "Artikel Baru",
          onClick: handleCreateArticle,
          icon: <Plus size={14} strokeWidth={3} />
        }}
        extraActions={
          <>
            <Button
              variant="secondary"
              onClick={() => setViewMode('chat')}
              leftIcon={<MessageSquare size={14} />}
              className="text-[10px] uppercase font-bold"
              size="sm"
            >
              Tanya AI
            </Button>
            <Button
              variant="secondary"
              onClick={() => setIsCategoryModalOpen(true)}
              leftIcon={<Tag size={14} />}
              className="text-[10px] uppercase font-bold"
              size="sm"
            >
              Kategori
            </Button>
          </>
        }
        bulkActions={
          <BulkActionGroup
            selectedCount={selectedIds.length}
            onDelete={() => setIsConfirmBulkDeleteOpen(true)}
          />
        }
      >
        <div className="flex items-center gap-3 shrink-0 ml-auto">
          <ComboBox
            value={filters.filterCategoryId || 'all'}
            onChange={(val: string | number) => filters.setFilterCategoryId(val === 'all' ? null : Number(val))}
            options={[
              { value: 'all', label: 'SEMUA KATEGORI' },
              ...categories.map(c => ({ value: c.id, label: c.name.toUpperCase() }))
            ]}
            className="w-56"
            placeholderSize="text-[10px] font-bold text-gray-900 uppercase "
          />
        </div>
      </StandardFilterBar>

      <div className="h-[75vh]">
        <BaseDataTable
          data={articles}
          columns={columns}
          isLoading={loadingArticles}
          sortConfig={filters.sortConfig}
          onSort={filters.handleSort as (key: string) => void}
          page={page}
          pageSize={pageSize}
          totalCount={articlesData?.totalCount || 0}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          onRowClick={handleEditArticle}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          emptyMessage="Artikel Tidak Ditemukan"
          emptyIcon={<Newspaper size={48} />}
        />
      </div>

      <KnowledgeBaseArticleModal
        isOpen={isArticleModalOpen}
        onClose={() => setIsArticleModalOpen(false)}
        article={selectedArticle}
        categories={categories}
        company={company}
        onSuccess={() => {
          refetchArticles();
        }}
      />

      <KnowledgeBaseCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        company={company}
        categories={categories}
        onSuccess={fetchCategories}
      />

      <ConfirmBulkDeleteModal
        isOpen={isConfirmBulkDeleteOpen}
        onClose={() => setIsConfirmBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        count={selectedIds.length}
        title="Hapus Artikel Masal"
        description={`Apakah Anda yakin ingin menghapus ${selectedIds.length} artikel yang dipilih? Tindakan ini permanen.`}
        isProcessing={bulkDeleteArticles.status === 'pending'}
      />
    </div>
  );
};
