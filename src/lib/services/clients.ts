import { createClient } from '@/lib/supabase-server';
import { Client, ClientCompany, ClientCompanyCategory } from '@/lib/types';

export async function getClients(params: {
  companyId: number;
  searchTerm?: string;
  companyFilter?: string;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  page?: number;
  pageSize?: number;
}) {
  const {
    companyId,
    searchTerm,
    companyFilter,
    sortConfig,
    page = 1,
    pageSize = 20,
  } = params;

  const supabase = await createClient();
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
}

export async function getClientsMetadata(companyId: number) {
  const supabase = await createClient();

  const [companiesRes, categoriesRes] = await Promise.all([
    supabase.from('client_companies').select('*').eq('company_id', companyId).order('name'),
    supabase.from('client_company_categories').select('*').eq('company_id', companyId).order('name')
  ]);

  return {
    clientCompanies: (companiesRes.data || []) as ClientCompany[],
    categories: (categoriesRes.data || []) as ClientCompanyCategory[]
  };
}

export async function getClientCompanies(params: {
  companyId: string | number;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
}) {
  const {
    companyId,
    searchTerm,
    page = 1,
    pageSize = 20,
    sortConfig,
  } = params;

  const supabase = await createClient();
  let query = supabase
    .from('client_companies')
    .select('*, client_company_categories(*)', { count: 'exact' })
    .eq('company_id', companyId);

  if (searchTerm) {
    query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,whatsapp.ilike.%${searchTerm}%`);
  }
  
  if (sortConfig) {
    query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
  } else {
    query = query.order('name', { ascending: true });
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

