import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Invoice } from '@/lib/types';

interface UseInvoicesQueryParams {
  companyId: string;
  searchTerm?: string;
  filterStatus?: string;
  filterClientId?: string;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  page?: number;
  pageSize?: number;
}

export function useInvoicesQuery({
  companyId,
  searchTerm,
  filterStatus,
  filterClientId,
  sortConfig,
  page = 1,
  pageSize = 20,
}: UseInvoicesQueryParams) {
  return useQuery({
    queryKey: ['invoices', companyId, searchTerm, filterStatus, filterClientId, sortConfig, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select('*, client:clients(*, client_company:client_companies(*)), invoice_items(*, products(*)), kwitansis(id)', { count: 'exact' })
        .eq('company_id', companyId);

      if (searchTerm) {
        const { data: clientsData } = await supabase.from('clients').select('id').ilike('name', `%${searchTerm}%`);
        const clientIds = clientsData?.map(c => c.id).join(',') || '';
        
        if (clientIds) {
          query = query.or(`number.ilike.%${searchTerm}%,client_id.in.(${clientIds})`);
        } else {
          query = query.ilike('number', `%${searchTerm}%`);
        }
      }

      if (filterStatus && filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (filterClientId && filterClientId !== 'all') {
        query = query.eq('client_id', filterClientId);
      }

      if (sortConfig) {
        query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
      } else {
        query = query.order('id', { ascending: false });
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      return {
        data: data as Invoice[],
        totalCount: count || 0,
      };
    },
    placeholderData: (previousData) => previousData,
  });
}

export function useInvoiceMutations() {
  const queryClient = useQueryClient();

  const bulkDeleteInvoices = useMutation({
    mutationFn: async (ids: number[]) => {
      const { error } = await supabase.from('invoices').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const bulkUpdateInvoicesStatus = useMutation({
    mutationFn: async ({ ids, status }: { ids: number[]; status: string }) => {
      const { error } = await supabase.from('invoices').update({ status }).in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  return { bulkDeleteInvoices, bulkUpdateInvoicesStatus };
}
