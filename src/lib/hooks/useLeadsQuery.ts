import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Lead, LeadStage, LeadSource, CompanyMember, ClientCompany, ClientCompanyCategory } from '@/lib/types';

interface FetchLeadsParams {
  companyId: number;
  searchTerm?: string;
  statusFilter?: string;
  assigneeFilter?: string;
  companyFilter?: string;
  startDate?: string;
  endDate?: string;
  dateFilterType?: string;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  page?: number;
  pageSize?: number;
}

export function useLeadsQuery({
  companyId,
  searchTerm,
  statusFilter,
  assigneeFilter,
  companyFilter,
  startDate,
  endDate,
  dateFilterType,
  sortConfig,
  page = 1,
  pageSize = 20,
}: FetchLeadsParams, initialData?: { data: Lead[], totalCount: number }) {
  return useQuery({
    queryKey: ['leads', { companyId, searchTerm, statusFilter, assigneeFilter, companyFilter, dateFilterType, startDate, endDate, sortConfig, page, pageSize }],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase.from('leads').select(`
        *,
        client_company:client_companies(name),
        sales_profile:profiles!leads_sales_id_fkey(full_name, avatar_url, email)
      `, { count: 'exact' });

      query = query.eq('company_id', companyId);

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,client_company_name.ilike.%${searchTerm}%`);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (assigneeFilter && assigneeFilter !== 'all') {
        query = query.eq('sales_id', assigneeFilter);
      }

      if (companyFilter && companyFilter !== 'all') {
        query = query.eq('client_company_id', companyFilter);
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

      // Always prioritize urgent leads
      query = query.order('is_urgent', { ascending: false });

      if (sortConfig) {
        query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
      } else {
        query = query
          .order('kanban_order', { ascending: true })
          .order('created_at', { ascending: false });
      }

      const { data, error, count } = await query.range(from, to);
      if (error) throw error;

      return {
        data: data as Lead[],
        totalCount: count || 0,
      };
    },
    initialData: initialData,
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

  const bulkDeleteLeads = useMutation({
    mutationFn: async (leadIds: number[]) => {
      const { error } = await supabase.from('leads').delete().in('id', leadIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const bulkUpdateLeadsStatus = useMutation({
    mutationFn: async ({ leadIds, status }: { leadIds: number[]; status: string }) => {
      const { error } = await supabase.from('leads').update({ status }).in('id', leadIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  return { deleteLead, updateLeadStatus, bulkDeleteLeads, bulkUpdateLeadsStatus };
}

export function useLeadMetadata(companyId: number, initialData?: any) {
  return {
    stages: useQuery({
      queryKey: ['lead-stages', companyId],
      queryFn: async () => {
        const { data, error } = await supabase.from('lead_stages').select('*').eq('company_id', companyId).order('sort_order');
        if (error) throw error;
        return data as LeadStage[];
      },
      initialData: initialData?.stages,
      enabled: !!companyId,
    }),
    sources: useQuery({
      queryKey: ['lead-sources', companyId],
      queryFn: async () => {
        const { data, error } = await supabase.from('lead_sources').select('*').eq('company_id', companyId).order('name');
        if (error) throw error;
        return data as LeadSource[];
      },
      initialData: initialData?.sources,
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
      initialData: initialData?.members,
      enabled: !!companyId,
    }),
    clientCompanies: useQuery({
      queryKey: ['client-companies', companyId],
      queryFn: async () => {
        const { data, error } = await supabase.from('client_companies').select('*').eq('company_id', companyId).order('name');
        if (error) throw error;
        return data as ClientCompany[];
      },
      initialData: initialData?.clientCompanies,
      enabled: !!companyId,
    }),
    categories: useQuery({
      queryKey: ['client-company-categories', companyId],
      queryFn: async () => {
        const { data, error } = await supabase.from('client_company_categories').select('*').eq('company_id', companyId).order('name');
        if (error) throw error;
        return data as ClientCompanyCategory[];
      },
      initialData: initialData?.categories,
      enabled: !!companyId,
    }),
  };
}
