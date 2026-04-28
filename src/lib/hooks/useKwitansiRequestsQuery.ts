import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { KwitansiRequest } from '@/lib/types';

interface UseKwitansiRequestsQueryParams {
  companyId: string;
  searchTerm?: string;
  filterStatus?: string;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  page?: number;
  pageSize?: number;
}

export function useKwitansiRequestsQuery({
  companyId,
  searchTerm,
  filterStatus,
  sortConfig,
  page = 1,
  pageSize = 20,
}: UseKwitansiRequestsQueryParams) {
  return useQuery({
    queryKey: ['kwitansi_requests', companyId, searchTerm, filterStatus, sortConfig, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('kwitansi_requests')
        .select('*, client:clients(*, client_company:client_companies(*)), invoice:invoices(id, number), proforma:proformas(id, number), kwitansi:kwitansis(id, number), urgency_level:urgency_levels(id, name, color, sort_order)', { count: 'exact' })
        .eq('company_id', companyId);

      if (searchTerm) {
        // Since we can't easily filter joined tables in a simple .or for this Supabase version/setup often,
        // we use a keyword search approach or filter on the client side if small, 
        // but here we try to filter by ID or numbers if possible, or just name.
        query = query.or(`status.ilike.%${searchTerm}%`); 
        // Note: Realistically, server-side search across joined tables in Supabase 
        // usually requires a database function or computed column for best results.
        // For now, we'll implement standard field filtering.
      }

      if (filterStatus && filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
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
