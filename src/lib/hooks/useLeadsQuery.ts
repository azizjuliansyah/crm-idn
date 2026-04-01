import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Lead, LeadStage, LeadSource, CompanyMember, ClientCompany, ClientCompanyCategory } from '@/lib/types';

interface FetchLeadsParams {
  companyId: number;
  searchTerm?: string;
  statusFilter?: string;
  assigneeFilter?: string;
  startDate?: string;
  endDate?: string;
  dateFilterType?: string;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
}

export function useLeadsQuery({
  companyId,
  searchTerm,
  statusFilter,
  assigneeFilter,
  startDate,
  endDate,
  dateFilterType,
  sortConfig,
}: FetchLeadsParams) {
  return useInfiniteQuery({
    queryKey: ['leads', { companyId, searchTerm, statusFilter, assigneeFilter, dateFilterType, startDate, endDate, sortConfig }],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * 20;
      const to = from + 19;

      let query = supabase.from('leads').select(`
        *,
        client_company:client_companies(name),
        sales_profile:profiles!leads_sales_id_fkey(full_name, avatar_url, email)
      `, { count: 'exact' });

      query = query.eq('company_id', companyId);

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (assigneeFilter && assigneeFilter !== 'all') {
        query = query.eq('sales_id', assigneeFilter);
      }

      if (dateFilterType === 'custom') {
        if (startDate) query = query.gte('input_date', startDate);
        if (endDate) query = query.lte('input_date', endDate);
      } else if (dateFilterType && dateFilterType !== 'all') {
        const daysAgo = parseInt(dateFilterType);
        const filterDate = new Date();
        filterDate.setDate(filterDate.getDate() - daysAgo);
        query = query.gte('input_date', filterDate.toISOString().split('T')[0]);
      }

      if (sortConfig) {
        query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
      } else {
        query = query
          .order('is_urgent', { ascending: false })
          .order('kanban_order', { ascending: true })
          .order('created_at', { ascending: false });
      }

      const { data, error, count } = await query.range(from, to);
      if (error) throw error;

      return {
        data: data as Lead[],
        nextPage: data.length === 20 ? pageParam + 1 : undefined,
        totalCount: count || 0,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!companyId,
  });
}

export function useLeadMutations() {
  const queryClient = useQueryClient();

  const deleteLead = useMutation({
    mutationFn: async (leadId: number) => {
      const { error } = await supabase.from('leads').delete().eq('id', leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const updateLeadStatus = useMutation({
    mutationFn: async ({ leadId, status, kanbanOrder }: { leadId: number; status: string; kanbanOrder?: number }) => {
      const payload: any = { status };
      if (kanbanOrder !== undefined) payload.kanban_order = kanbanOrder;
      
      const { error } = await supabase.from('leads').update(payload).eq('id', leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  return { deleteLead, updateLeadStatus };
}

export function useLeadMetadata(companyId: number) {
  return {
    stages: useQuery({
      queryKey: ['lead-stages', companyId],
      queryFn: async () => {
        const { data, error } = await supabase.from('lead_stages').select('*').eq('company_id', companyId).order('sort_order');
        if (error) throw error;
        return data as LeadStage[];
      },
      enabled: !!companyId,
    }),
    sources: useQuery({
      queryKey: ['lead-sources', companyId],
      queryFn: async () => {
        const { data, error } = await supabase.from('lead_sources').select('*').eq('company_id', companyId).order('name');
        if (error) throw error;
        return data as LeadSource[];
      },
      enabled: !!companyId,
    }),
    members: useQuery({
      queryKey: ['company-members', companyId],
      queryFn: async () => {
        const { data, error } = await supabase.from('company_members').select(`
          *,
          profile:profiles!inner(id, full_name, avatar_url, email),
          role:company_roles(name)
        `).eq('company_id', companyId);
        if (error) throw error;
        return data as CompanyMember[];
      },
      enabled: !!companyId,
    }),
    clientCompanies: useQuery({
      queryKey: ['client-companies', companyId],
      queryFn: async () => {
        const { data, error } = await supabase.from('client_companies').select('*').eq('company_id', companyId).order('name');
        if (error) throw error;
        return data as ClientCompany[];
      },
      enabled: !!companyId,
    }),
    categories: useQuery({
      queryKey: ['client-company-categories', companyId],
      queryFn: async () => {
        const { data, error } = await supabase.from('client_company_categories').select('*').eq('company_id', companyId).order('name');
        if (error) throw error;
        return data as ClientCompanyCategory[];
      },
      enabled: !!companyId,
    }),
  };
}
