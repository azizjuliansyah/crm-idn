import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Deal, Pipeline, PipelineStage, CompanyMember, Client, ClientCompany, ClientCompanyCategory } from '@/lib/types';

interface FetchDealsParams {
  companyId: number;
  pipelineId?: number;
  searchTerm?: string;
  statusFilter?: string;
  assigneeFilter?: string;
  companyFilter?: string;
  probabilityFilter?: string;
  startDate?: string;
  endDate?: string;
  dateFilterType?: string;
  followUpFilter?: string;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  page?: number;
  pageSize?: number;
}

export function useDealsQuery({
  companyId,
  pipelineId,
  searchTerm,
  statusFilter,
  assigneeFilter,
  companyFilter,
  probabilityFilter,
  startDate,
  endDate,
  dateFilterType,
  followUpFilter,
  sortConfig,
  page = 1,
  pageSize = 20,
}: FetchDealsParams, initialData?: { data: Deal[], totalCount: number }) {
  return useQuery({
    queryKey: ['deals', { companyId, pipelineId, searchTerm, statusFilter, assigneeFilter, companyFilter, probabilityFilter, dateFilterType, startDate, endDate, followUpFilter, sortConfig, page, pageSize }],
    queryFn: async () => {
      if (!pipelineId) return { data: [], totalCount: 0 };
      
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const isCompanyFilterActive = companyFilter && companyFilter !== 'all';
      const clientSelectStr = isCompanyFilterActive ? 'client:clients!inner(*)' : 'client:clients(*)';

      let query = supabase.from('deals').select(`
        *,
        sales_profile:profiles!deals_sales_id_fkey(full_name, avatar_url, email),
        ${clientSelectStr},
        quotations(id, number)
      `, { count: 'exact' });

      query = query.eq('pipeline_id', pipelineId);

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,contact_name.ilike.%${searchTerm}%,customer_company.ilike.%${searchTerm}%`);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('stage_id', statusFilter);
      }

      if (assigneeFilter && assigneeFilter !== 'all') {
        query = query.eq('sales_id', assigneeFilter);
      }

      if (isCompanyFilterActive) {
        query = query.eq('client.client_company_id', companyFilter);
      }

      if (probabilityFilter && probabilityFilter !== 'all') {
        const prob = parseInt(probabilityFilter);
        if (!isNaN(prob)) {
          if (prob === 100) query = query.eq('probability', 100);
          else query = query.gte('probability', prob).lt('probability', prob + 25);
        }
      }

      if (dateFilterType === 'custom') {
        if (startDate) query = query.gte('input_date', startDate);
        if (endDate) query = query.lte('input_date', endDate);
      } else if (dateFilterType && dateFilterType !== 'all') {
        const daysAgo = parseInt(dateFilterType);
        if (!isNaN(daysAgo)) {
          const filterDate = new Date();
          filterDate.setDate(filterDate.getDate() - daysAgo);
          query = query.gte('input_date', filterDate.toISOString().split('T')[0]);
        }
      }

      if (followUpFilter && followUpFilter !== 'all') {
        query = query.eq('follow_up', parseInt(followUpFilter));
      }

      // Always prioritize urgent deals
      query = query.order('is_urgent', { ascending: false });

      const orderKey = sortConfig?.key || 'created_at';
      const orderDirection = sortConfig?.direction || 'desc';

      query = query.order(orderKey, { ascending: orderDirection === 'asc' });

      const { data, error, count } = await query.range(from, to);
      if (error) throw error;

      return {
        data: data as Deal[],
        totalCount: count || 0,
      };
    },
    initialData: (!searchTerm && (!statusFilter || statusFilter === 'all') && (!assigneeFilter || assigneeFilter === 'all') && (!companyFilter || companyFilter === 'all') && (!probabilityFilter || probabilityFilter === 'all') && (!dateFilterType || dateFilterType === 'all') && (!followUpFilter || followUpFilter === 'all') && !sortConfig && page === 1) ? initialData : undefined,
    enabled: !!companyId && !!pipelineId,
  });
}

export function useDealMutations() {
  const queryClient = useQueryClient();

  const deleteDeal = useMutation({
    mutationFn: async (dealId: number) => {
      const { error } = await supabase.from('deals').delete().eq('id', dealId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });

  const updateDealStatus = useMutation({
    mutationFn: async ({ dealId, stageId, kanbanOrder }: { dealId: number; stageId: string | number; kanbanOrder?: number }) => {
      const payload: any = { stage_id: stageId };
      if (kanbanOrder !== undefined) payload.kanban_order = kanbanOrder;
      
      const { error } = await supabase.from('deals').update(payload).eq('id', dealId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });

  const bulkDeleteDeals = useMutation({
    mutationFn: async (dealIds: number[]) => {
      const { error } = await supabase.from('deals').delete().in('id', dealIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });

  const bulkUpdateDealsStage = useMutation({
    mutationFn: async ({ dealIds, stageId }: { dealIds: number[]; stageId: string | number }) => {
      const { error } = await supabase.from('deals').update({ stage_id: stageId }).in('id', dealIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });

  return { deleteDeal, updateDealStatus, bulkDeleteDeals, bulkUpdateDealsStage };
}

export function useDealMetadata(companyId: number, pipelineId?: number, initialData?: any) {
  return {
    pipeline: useQuery({
      queryKey: ['pipeline', companyId, pipelineId],
      queryFn: async () => {
        let query = supabase.from('pipelines').select('*, stages:pipeline_stages(*)').eq('company_id', companyId);
        if (pipelineId) {
          query = query.eq('id', pipelineId);
        }
        const { data, error } = await query.limit(1).single();
        if (error) throw error;
        
        if (data && data.stages) {
          data.stages = data.stages.sort((a: any, b: any) => a.sort_order - b.sort_order);
        }
        return data as Pipeline;
      },
      initialData: initialData?.pipeline,
      enabled: !!companyId,
    }),
    members: useQuery({
      queryKey: ['company-members', companyId],
      queryFn: async () => {
        const { data, error } = await supabase.from('company_members').select(`
          *,
          profile:profiles!inner(full_name, avatar_url, email),
          role:company_roles(name)
        `).eq('company_id', companyId);
        if (error) throw error;
        return data as CompanyMember[];
      },
      initialData: initialData?.members,
      enabled: !!companyId,
    }),
    clients: useQuery({
      queryKey: ['clients', companyId],
      queryFn: async () => {
        const { data, error } = await supabase.from('clients').select('*').eq('company_id', companyId).order('name');
        if (error) throw error;
        return data as Client[];
      },
      initialData: initialData?.clients,
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
