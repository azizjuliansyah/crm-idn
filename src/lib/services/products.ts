import { createClient } from '@/lib/supabase-server';
import { Product, ProductCategory, ProductUnit } from '@/lib/types';

export async function getProducts(params: {
  companyId: string | number;
  searchTerm?: string;
  filterCategoryId?: number | null;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  page?: number;
  pageSize?: number;
}) {
  const {
    companyId,
    searchTerm,
    filterCategoryId,
    sortConfig,
    page = 1,
    pageSize = 20,
  } = params;

  const supabase = await createClient();
  let query = supabase
    .from('products')
    .select('*, product_categories(*), product_units(*)', { count: 'exact' })
    .eq('company_id', companyId);

  if (searchTerm) {
    query = query.ilike('name', `%${searchTerm}%`);
  }

  if (filterCategoryId) {
    query = query.eq('category_id', filterCategoryId);
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
    data: data as Product[],
    totalCount: count || 0,
  };
}

export async function getProductsMetadata(companyId: number) {
  const supabase = await createClient();

  const [categoriesRes, unitsRes] = await Promise.all([
    supabase.from('product_categories').select('*').eq('company_id', companyId),
    supabase.from('product_units').select('*').eq('company_id', companyId)
  ]);

  return {
    categories: (categoriesRes.data || []) as ProductCategory[],
    units: (unitsRes.data || []) as ProductUnit[]
  };
}
