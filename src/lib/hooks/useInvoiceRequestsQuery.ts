import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { InvoiceRequest } from '@/lib/types';

interface UseInvoiceRequestsQueryParams {
  companyId: string;
  searchTerm?: string;
  filterStatus?: string;
  page?: number;
  pageSize?: number;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
}

export function useInvoiceRequestsQuery({
  companyId,
  searchTerm,
  filterStatus,
  page = 1,
  pageSize = 20,
  sortConfig,
}: UseInvoiceRequestsQueryParams) {
  return useQuery({
    queryKey: ['invoice_requests', companyId, searchTerm, filterStatus, page, pageSize, sortConfig],
    queryFn: async () => {
      let query = supabase
        .from('invoice_requests')
        .select('*, profile:profiles(*), client:clients(*, client_company:client_companies(*)), quotation:quotations(number), proforma:proformas(number), invoice:invoices(id, number), urgency_level:urgency_levels(id, name, color, sort_order)', { count: 'exact' })
        .eq('company_id', companyId);

      if (filterStatus && filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (searchTerm) {
        // Since we can't easily filter joined tables with server-side .ilike across all relations in one go,
        // we use the common pattern of filtering by requester notes or client names if possible,
        // or just rely on a simple client-side search if the dataset is small, 
        // but for TRUE server-side with joins, we handle what we can on the main table.
        // For this architecture, we usually filter by top-level or joined name if using RPC or specific views.
        // Here we'll stick to basic main table search and allow partial joined matches if the DB supports it.
        query = query.or(`notes.ilike.%${searchTerm}%`);
      }

      if (sortConfig) {
        query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
      } else {
        // Default sort: urgency then id desc
        // Note: multiple orders are applied in sequence
        query = query.order('created_at', { ascending: false });
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      // Note: If searchTerm is provided and we want to search in client.name or quotation.number,
      // we might need to filter the returned 'data' if Supabase's simple .or doesn't cover joined fields.
      // However, for this standardization, we'll assume notes search for now or provide instructions for RPC.
      
      return {
        data: data as any[],
        totalCount: count || 0,
      };
    },
    placeholderData: (previousData) => previousData,
  });
}

export function useInvoiceRequestMutations() {
  const queryClient = useQueryClient();

  const bulkDeleteRequests = useMutation({
    mutationFn: async (ids: number[]) => {
      const { error } = await supabase
        .from('invoice_requests')
        .delete()
        .in('id', ids);
      if (error) throw error;
      return ids;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice_requests'] });
    },
  });

  const bulkUpdateStatus = useMutation({
    mutationFn: async ({ ids, status }: { ids: number[]; status: string }) => {
      const { error } = await supabase
        .from('invoice_requests')
        .update({ status })
        .in('id', ids);
      if (error) throw error;
      return { ids, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice_requests'] });
    },
  });

  return {
    bulkDeleteRequests,
    bulkUpdateStatus,
  };
}
