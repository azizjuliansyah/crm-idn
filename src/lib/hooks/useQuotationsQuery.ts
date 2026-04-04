import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Quotation } from '@/lib/types';
import { SortConfig } from './useQuotationFilters';

interface UseQuotationsQueryParams {
  companyId: string;
  searchTerm?: string;
  filterStatus?: string;
  filterClientId?: string;
  sortConfig?: SortConfig;
  page?: number;
  pageSize?: number;
}

export function useQuotationsQuery({
  companyId,
  searchTerm,
  filterStatus,
  filterClientId,
  sortConfig,
  page = 1,
  pageSize = 20,
}: UseQuotationsQueryParams) {
  return useQuery({
    queryKey: ['quotations', companyId, searchTerm, filterStatus, filterClientId, sortConfig, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('quotations')
        .select('*, client:clients(*, client_company:client_companies(*)), quotation_items(*, products(*))', { count: 'exact' })
        .eq('company_id', companyId);

      if (searchTerm) {
        query = query.or(`number.ilike.%${searchTerm}%,client_name.ilike.%${searchTerm}%`);
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
        data: data as Quotation[],
        totalCount: count || 0,
      };
    },
    placeholderData: (previousData) => previousData,
  });
}

export function useQuotationMetadata(companyId: string) {
  const queryClient = useQueryClient();

  const clients = useQuery({
    queryKey: ['clients', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*, client_company:client_companies(*)')
        .eq('company_id', companyId)
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const clientCompanies = useQuery({
    queryKey: ['client_companies', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_companies')
        .select('*')
        .eq('company_id', companyId)
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  return { clients, clientCompanies };
}

export function useQuotationMutations() {
  const queryClient = useQueryClient();

  const bulkDeleteQuotations = useMutation({
    mutationFn: async (ids: number[]) => {
      const { error } = await supabase.from('quotations').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
  });

  const bulkUpdateQuotationsStatus = useMutation({
    mutationFn: async ({ ids, status }: { ids: number[]; status: string }) => {
      const { error } = await supabase.from('quotations').update({ status }).in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
  });

  return { bulkDeleteQuotations, bulkUpdateQuotationsStatus };
}
