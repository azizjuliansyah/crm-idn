import { createClient } from '@/lib/supabase-server';
import { Lead, LeadStage, LeadSource, CompanyMember, ClientCompany, ClientCompanyCategory } from '@/lib/types';

export async function getLeads(params: {
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
}) {
  const {
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
  } = params;

  const supabase = await createClient();
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
}

export async function getLeadsMetadata(companyId: number) {
  const supabase = await createClient();

  const [stagesRes, sourcesRes, membersRes, companiesRes, categoriesRes] = await Promise.all([
    supabase.from('lead_stages').select('*').eq('company_id', companyId).order('sort_order'),
    supabase.from('lead_sources').select('*').eq('company_id', companyId).order('name'),
    supabase.from('company_members').select(`
      *,
      profile:profiles!inner(id, full_name, avatar_url, email),
      role:company_roles(name)
    `).eq('company_id', companyId),
    supabase.from('client_companies').select('*').eq('company_id', companyId).order('name'),
    supabase.from('client_company_categories').select('*').eq('company_id', companyId).order('name')
  ]);

  return {
    stages: (stagesRes.data || []) as LeadStage[],
    sources: (sourcesRes.data || []) as LeadSource[],
    members: (membersRes.data || []) as CompanyMember[],
    clientCompanies: (companiesRes.data || []) as ClientCompany[],
    categories: (categoriesRes.data || []) as ClientCompanyCategory[]
  };
}
