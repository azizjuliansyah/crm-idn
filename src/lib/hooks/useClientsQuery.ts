import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Client, ClientCompany, ClientCompanyCategory } from '@/lib/types';

interface FetchClientsParams {
  companyId: number;
  searchTerm?: string;
  companyFilter?: string;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  page?: number;
  pageSize?: number;
}

export function useClientsQuery({
  companyId,
  searchTerm,
  companyFilter,
  sortConfig,
  page = 1,
  pageSize = 20,
}: FetchClientsParams) {
  return useQuery({
    queryKey: ['clients-list', { companyId, searchTerm, companyFilter, sortConfig, page, pageSize }],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('clients')
        .select('*, client_company:client_companies(*)', { count: 'exact' })
        .eq('company_id', companyId);

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,whatsapp.ilike.%${searchTerm}%`);
      }

      if (companyFilter && companyFilter !== 'all') {
        query = query.eq('client_company_id', companyFilter);
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
        totalCount: count || 0,
      };
    },
    enabled: !!companyId,
    placeholderData: (previousData) => previousData,
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

  const upsertClient = useMutation({
    mutationFn: async (client: Partial<Client>) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { client_company, count, ...payload } = client as any;
      
      if (payload.id) {
        const { data, error } = await supabase.from('clients').update(payload).eq('id', payload.id).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase.from('clients').insert([payload]).select().single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients-list'] });
    },
  });

  return { deleteClient, bulkDeleteClients, upsertClient };
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
