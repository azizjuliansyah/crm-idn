import { createClient } from '@/lib/supabase-server';

export async function getSalesRequests(params: {
  companyId: string | number;
  categoryId: number;
  searchTerm?: string;
  filterStatus?: string;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  page?: number;
  pageSize?: number;
}) {
  const {
    companyId,
    categoryId,
    searchTerm,
    filterStatus,
    sortConfig,
    page = 1,
    pageSize = 20,
  } = params;

  const supabase = await createClient();
  let query = supabase
    .from('sales_requests')
    .select('*, client:clients(*, client_company:client_companies(*)), quotation:quotations(number), proforma:proformas(number), urgency_level:urgency_levels(id, name, color, sort_order)', { count: 'exact' })
    .eq('company_id', companyId)
    .eq('category_id', categoryId);

  if (searchTerm) {
    query = query.ilike('client.name', `%${searchTerm}%`);
  }

  if (filterStatus && filterStatus !== 'all') {
    query = query.eq('status', filterStatus);
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
    data: data as any[],
    totalCount: count || 0,
  };
}

export async function getSalesRequestCategory(categoryId: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sales_request_categories')
    .select('*')
    .eq('id', categoryId)
    .single();
  if (error) throw error;
  return data;
}
