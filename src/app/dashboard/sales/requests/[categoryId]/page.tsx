import { createClient } from '@/lib/supabase-server';
import { getSalesRequests, getSalesRequestCategory } from '@/lib/services/sales-requests';
import { SalesRequestsView } from '@/components/features/sales-requests/SalesRequestsView';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function SalesRequestsPage({ params }: { params: { categoryId: string } }) {
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
  const categoryId = parseInt(params.categoryId);

  if (isNaN(categoryId)) return null;

  const { data: activeCompany } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .maybeSingle();

  if (!activeCompany) return null;

  const [initialRequests, initialCategory] = await Promise.all([
    getSalesRequests({ companyId, categoryId }),
    getSalesRequestCategory(categoryId)
  ]);

  return (
    <SalesRequestsView 
      company={activeCompany} 
      categoryId={categoryId}
      initialRequests={initialRequests}
      initialCategory={initialCategory}
    />
  );
}
