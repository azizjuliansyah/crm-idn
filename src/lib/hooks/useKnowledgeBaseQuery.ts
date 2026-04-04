import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { KbArticle } from '@/lib/types';

interface UseKnowledgeBaseQueryParams {
  companyId: string;
  searchTerm?: string;
  filterCategoryId?: number | null;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  page?: number;
  pageSize?: number;
}

export function useKnowledgeBaseQuery({
  companyId,
  searchTerm,
  filterCategoryId,
  sortConfig,
  page = 1,
  pageSize = 20,
}: UseKnowledgeBaseQueryParams) {
  return useQuery({
    queryKey: ['knowledge_base', companyId, searchTerm, filterCategoryId, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('kb_articles')
        .select('*, category:kb_categories(*)', { count: 'exact' })
        .eq('company_id', companyId);

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
      }

      if (filterCategoryId) {
        query = query.eq('category_id', filterCategoryId);
      }

      if (sortConfig) {
        query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      return {
        data: data as any[],
        totalCount: count || 0,
      };
    },
    placeholderData: (previousData) => previousData,
  });
}

export function useKnowledgeBaseMutations() {
  const queryClient = useQueryClient();

  const bulkDeleteArticles = useMutation({
    mutationFn: async (ids: number[]) => {
      const { error } = await supabase.from('kb_articles').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge_base'] });
    },
  });

  return { bulkDeleteArticles };
}
