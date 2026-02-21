'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    if (!confirm("Hapus artikel ini?")) return;
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

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-blue-600 mb-4" /><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sinkronisasi Basis Pengetahuan...</p></div>;

  return (
    <div className="space-y-6 relative pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-in fade-in duration-300">
        <div className="relative min-w-[300px] max-w-[400px] flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
          <input 
            type="text" 
            placeholder="Cari artikel bantuan..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl outline-none focus:bg-white transition-all text-[11px] font-bold" 
          />
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-6 py-3.5 bg-gray-50 text-gray-600 border border-gray-200 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-100 transition-all active:scale-95"
          >
            <Tags size={14} /> Kelola Kategori
          </button>
          <button 
            onClick={handleNewArticle}
            className="px-6 py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
          >
            <Plus size={14} /> Artikel Baru
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Artikel & Konten</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Kategori</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tanggal Dibuat</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredArticles.map(article => (
                <tr key={article.id} className="hover:bg-gray-50/30 group transition-all">
                  <td className="px-8 py-6 max-w-md">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-indigo-100/50">
                        <FileText size={18} />
                      </div>
                      <div className="overflow-hidden">
                        <button 
                          onClick={() => handleOpenArticle(article)}
                          className="text-sm font-bold text-gray-900 tracking-tight text-left hover:text-indigo-600 transition-colors uppercase truncate block w-full"
                        >
                          {article.title}
                        </button>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-1 leading-relaxed italic">
                          {article.content}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-white border border-indigo-100 rounded-full text-[9px] font-bold text-indigo-600 uppercase tracking-tighter shadow-sm">
                      {article.kb_categories?.name || 'UMUM'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-xs font-bold text-gray-400 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                       <Calendar size={12} className="opacity-40" />
                       {new Date(article.created_at || '').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                       <button 
                        onClick={() => handleOpenArticle(article)}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                        title="Edit Artikel"
                       >
                         <Edit2 size={16} />
                       </button>
                       <button 
                        onClick={() => handleDeleteArticle(article.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                        title="Hapus Artikel"
                       >
                         <Trash2 size={16} />
                       </button>
                       <button 
                        onClick={() => handleOpenArticle(article)}
                        className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg"
                        title="Baca Artikel"
                       >
                         <Eye size={16} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredArticles.length === 0 && (
            <div className="py-32 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100 shadow-inner">
                 <BookOpen size={32} className="text-gray-200" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300">Basis pengetahuan belum tersedia</p>
            </div>
          )}
        </div>
      </div>

      <KnowledgeBaseChat 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(prev => !prev)}
        articles={articles}
        aiSetting={aiSetting}
        onNavigate={(path) => router.push(path)}
        onOpenArticle={handleOpenArticle}
      />

      <KnowledgeBaseArticleModal 
        isOpen={isArticleModalOpen}
        onClose={() => setIsArticleModalOpen(false)}
        company={company}
        categories={categories}
        article={selectedArticle}
        onSuccess={fetchData}
      />
      
      <KnowledgeBaseCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        company={company}
        categories={categories}
        onSuccess={fetchData}
      />
    </div>
  );
};
