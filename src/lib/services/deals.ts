import { createClient } from '@/lib/supabase-server';
import { Deal, Pipeline, CompanyMember, Client, ClientCompany, ClientCompanyCategory } from '@/lib/types';

export async function getDeals(params: {
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
}) {
  const {
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
  } = params;

  if (!pipelineId) return { data: [], totalCount: 0 };

  const supabase = await createClient();
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
}

export async function getDealsMetadata(companyId: number, pipelineId?: number) {
  const supabase = await createClient();

  const [pipelineRes, membersRes, clientsRes, companiesRes, categoriesRes] = await Promise.all([
    (async () => {
        let q = supabase.from('pipelines').select('*, stages:pipeline_stages(*)').eq('company_id', companyId);
        if (pipelineId) q = q.eq('id', pipelineId);
        const { data } = await q.limit(1).maybeSingle();
        if (data && data.stages) {
          data.stages = data.stages.sort((a: any, b: any) => a.sort_order - b.sort_order);
        }
        return data as Pipeline | null;
    })(),
    supabase.from('company_members').select(`
      *,
      profile:profiles!inner(full_name, avatar_url, email),
      role:company_roles(name)
    `).eq('company_id', companyId),
    supabase.from('clients').select('*').eq('company_id', companyId).order('name'),
    supabase.from('client_companies').select('*').eq('company_id', companyId).order('name'),
    supabase.from('client_company_categories').select('*').eq('company_id', companyId).order('name')
  ]);

  return {
    pipeline: pipelineRes,
    members: (membersRes.data || []) as CompanyMember[],
    clients: (clientsRes.data || []) as Client[],
    clientCompanies: (companiesRes.data || []) as ClientCompany[],
    categories: (categoriesRes.data || []) as ClientCompanyCategory[]
  };
}
