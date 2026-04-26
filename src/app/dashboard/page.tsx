import { createClient } from '@/lib/supabase-server';
import { getDashboardStats } from '@/lib/services/dashboard';
import { DashboardOverview } from '@/components/features/dashboard/DashboardOverview';
import { cookies } from 'next/headers';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Try to get active company from cookie, fallback to first company
  const cookieStore = await cookies();
  const activeCompanyIdStr = cookieStore.get('crm_active_company_id')?.value;
  
  let companyId: number | null = activeCompanyIdStr ? parseInt(activeCompanyIdStr) : null;
  let company: any = null;

  if (companyId) {
    const { data } = await supabase.from('companies').select('*').eq('id', companyId).maybeSingle();
    company = data;
  }

  if (!company) {
    // Fallback: get the first company the user is a member of
    const { data: memberCompanies } = await supabase
      .from('company_members')
      .select('company:companies(*)')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();
    
    if (memberCompanies) {
      company = (memberCompanies as any).company;
      companyId = company.id;
    }
  }

  if (!company) return null;

  const stats = await getDashboardStats(companyId!);

  return <DashboardOverview company={company} initialStats={stats} />;
}
