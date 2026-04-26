import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { SalesRequest } from '@/lib/types';

interface UseSalesRequestsQueryParams {
  companyId: string;
  categoryIdIndex: number;
  searchTerm?: string;
  filterStatus?: string;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  page?: number;
  pageSize?: number;
}

export function useSalesRequestsQuery({
  companyId,
  categoryIdIndex,
  searchTerm,
  filterStatus,
  sortConfig,
  page = 1,
  pageSize = 20,
}: UseSalesRequestsQueryParams, initialData?: { data: any[], totalCount: number }) {
  return useQuery({
    queryKey: ['sales_requests', companyId, categoryIdIndex, searchTerm, filterStatus, sortConfig, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('sales_requests')
        .select('*, client:clients(*, client_company:client_companies(*)), quotation:quotations(number), proforma:proformas(number), urgency_level:urgency_levels(id, name, color, sort_order)', { count: 'exact' })
        .eq('company_id', companyId)
        .eq('category_id', categoryIdIndex);

      if (searchTerm) {
        // Search in client name
        query = query.ilike('client.name', `%${searchTerm}%`);
      }

      if (filterStatus && filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (sortConfig) {
        query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
      } else {
        // Default sort: urgency then id
        query = query.order('id', { ascending: false });
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
    initialData: initialData,
    placeholderData: (previousData) => previousData,
  });
}

export function useSalesRequestMutations() {
    const queryClient = useQueryClient();
    
    const bulkDeleteSalesRequests = useMutation({
        mutationFn: async (ids: number[]) => {
            const { error } = await supabase.from('sales_requests').delete().in('id', ids);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales_requests'] });
        }
    });

    const bulkUpdateSalesRequestsStatus = useMutation({
        mutationFn: async ({ ids, status }: { ids: number[], status: string }) => {
            const { error } = await supabase.from('sales_requests').update({ status }).in('id', ids);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales_requests'] });
        }
    });

    return { bulkDeleteSalesRequests, bulkUpdateSalesRequestsStatus };
}
