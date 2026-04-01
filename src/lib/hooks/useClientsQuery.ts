import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Client, ClientCompany, ClientCompanyCategory } from '@/lib/types';

interface FetchClientsParams {
  companyId: number;
  searchTerm?: string;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
}

export function useClientsQuery({
  companyId,
  searchTerm,
  sortConfig,
}: FetchClientsParams) {
  return useInfiniteQuery({
    queryKey: ['clients-list', { companyId, searchTerm, sortConfig }],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * 20;
      const to = from + 19;

      let query = supabase
        .from('clients')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId);

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      if (sortConfig) {
        query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
      } else {
        query = query.order('id', { ascending: false });
      }

      const { data, error, count } = await query.range(from, to);
      if (error) throw error;

      return {
        data: data as Client[],
        nextPage: data.length === 20 ? pageParam + 1 : undefined,
        totalCount: count || 0,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!companyId,
  });
}

export function useClientMutations() {
  const queryClient = useQueryClient();

  const deleteClient = useMutation({
    mutationFn: async (clientId: number) => {
      const { error } = await supabase.from('clients').delete().eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients-list'] });
    },
  });

  const bulkDeleteClients = useMutation({
    mutationFn: async (clientIds: number[]) => {
      const { error } = await supabase.from('clients').delete().in('id', clientIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients-list'] });
    },
  });

  return { deleteClient, bulkDeleteClients };
}

export function useClientMetadata(companyId: number) {
  return {
    clientCompanies: useQuery({
      queryKey: ['client-companies', companyId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('client_companies')
          .select('*')
          .eq('company_id', companyId)
          .order('name');
        if (error) throw error;
        return data as ClientCompany[];
      },
      enabled: !!companyId,
    }),
    categories: useQuery({
      queryKey: ['client-company-categories', companyId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('client_company_categories')
          .select('*')
          .eq('company_id', companyId)
          .order('name');
        if (error) throw error;
        return data as ClientCompanyCategory[];
      },
      enabled: !!companyId,
    }),
  };
}
