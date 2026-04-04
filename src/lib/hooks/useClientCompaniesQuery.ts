import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ClientCompany } from '@/lib/types';

interface UseClientCompaniesQueryParams {
  companyId: string;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
}

export function useClientCompaniesQuery({
  companyId,
  searchTerm,
  page = 1,
  pageSize = 20,
  sortConfig,
}: UseClientCompaniesQueryParams) {
  return useQuery({
    queryKey: ['client_companies', companyId, searchTerm, page, pageSize, sortConfig],
    queryFn: async () => {
      let query = supabase
        .from('client_companies')
        .select('*, client_company_categories(*)', { count: 'exact' })
        .eq('company_id', companyId);

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,whatsapp.ilike.%${searchTerm}%`);
      }
      
      if (sortConfig) {
        query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
      } else {
        query = query.order('name', { ascending: true });
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
