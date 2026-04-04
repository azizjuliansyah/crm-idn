import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Sop } from '@/lib/types';

interface UseSopsQueryParams {
  companyId: string;
  categoryId?: number;
  isArchive?: boolean;
  searchTerm?: string;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  page?: number;
  pageSize?: number;
}

export function useSopsQuery({
  companyId,
  categoryId,
  isArchive,
  searchTerm,
  sortConfig,
  page = 1,
  pageSize = 20,
}: UseSopsQueryParams) {
  return useQuery({
    queryKey: ['sops', companyId, categoryId, isArchive, searchTerm, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('sops')
        .select('*, sop_categories(*)', { count: 'exact' })
        .eq('company_id', companyId);

      if (isArchive) {
        query = query.eq('is_archived', true);
      } else {
        query = query.eq('is_archived', false);
        if (categoryId) {
          query = query.eq('category_id', categoryId);
        }
      }

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,document_number.ilike.%${searchTerm}%`);
      }

      if (sortConfig) {
        query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
      } else {
        query = query.order('document_number').order('revision_number', { ascending: false });
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
