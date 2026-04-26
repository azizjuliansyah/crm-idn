import { createClient } from '@/lib/supabase-server';
import { getProducts, getProductsMetadata } from '@/lib/services/products';
import { ProductsView } from '@/components/features/products/ProductsView';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const cookieStore = await cookies();
  const activeCompanyIdStr = cookieStore.get('crm_active_company_id')?.value;
  
  if (!activeCompanyIdStr) {
     return null;
  }

  const companyId = parseInt(activeCompanyIdStr);
  const { data: activeCompany } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .maybeSingle();

  if (!activeCompany) return null;

  const [initialProducts, metadata] = await Promise.all([
    getProducts({ companyId }),
    getProductsMetadata(companyId)
  ]);

  return (
    <ProductsView 
      company={activeCompany} 
      initialProducts={initialProducts}
      metadata={metadata}
    />
  );
}
