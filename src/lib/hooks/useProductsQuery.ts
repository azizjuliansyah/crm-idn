import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Product, ProductCategory, ProductUnit } from '@/lib/types';

interface UseProductsQueryParams {
  companyId: string;
  searchTerm?: string;
  filterCategoryId?: number | null;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  page?: number;
  pageSize?: number;
}

export function useProductsQuery({
  companyId,
  searchTerm,
  filterCategoryId,
  sortConfig,
  page = 1,
  pageSize = 20,
}: UseProductsQueryParams, initialData?: { data: any[], totalCount: number }) {
  return useQuery({
    queryKey: ['products', companyId, searchTerm, filterCategoryId, sortConfig, page, pageSize],
    queryFn: async () => {
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
        data: data as any[],
        totalCount: count || 0,
      };
    },
    initialData: initialData,
    placeholderData: (previousData) => previousData,
  });
}

export function useProductMutations() {
    const queryClient = useQueryClient();

    const upsertProduct = useMutation({
        mutationFn: async (product: Partial<Product>) => {
            const isEditing = !!product.id;
            if (isEditing) {
                const { data, error } = await supabase.from('products').update(product).eq('id', product.id).select().single();
                if (error) throw error;
                return data;
            } else {
                const { data, error } = await supabase.from('products').insert([product]).select().single();
                if (error) throw error;
                return data;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        }
    });

    const addCategory = useMutation({
        mutationFn: async ({ name, company_id }: { name: string, company_id: number }) => {
            const { data, error } = await supabase.from('product_categories').insert([{ name, company_id }]).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['product_categories'] });
        }
    });

    const addUnit = useMutation({
        mutationFn: async ({ name, company_id }: { name: string, company_id: number }) => {
            const { data, error } = await supabase.from('product_units').insert([{ name, company_id }]).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['product_units'] });
        }
    });

    const bulkDeleteProducts = useMutation({
        mutationFn: async (ids: number[]) => {
            const { error } = await supabase.from('products').delete().in('id', ids);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        }
    });
    const deleteProduct = useMutation({
        mutationFn: async ({ id }: { id: number }) => {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        }
    });

    return { upsertProduct, addCategory, addUnit, bulkDeleteProducts, deleteProduct };
}

export function useProductMetadata(companyId: number, initialData?: any) {
    const categories = useQuery({
        queryKey: ['product_categories', companyId],
        queryFn: async () => {
            const { data, error } = await supabase.from('product_categories').select('*').eq('company_id', companyId);
            if (error) throw error;
            return data as ProductCategory[];
        },
        initialData: initialData?.categories
    });

    const units = useQuery({
        queryKey: ['product_units', companyId],
        queryFn: async () => {
            const { data, error } = await supabase.from('product_units').select('*').eq('company_id', companyId);
            if (error) throw error;
            return data as ProductUnit[];
        },
        initialData: initialData?.units
    });

    return { categories, units };
}
