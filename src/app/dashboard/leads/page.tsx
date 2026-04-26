import { createClient } from '@/lib/supabase-server';
import { getLeads, getLeadsMetadata } from '@/lib/services/leads';
import { LeadsView } from '@/components/features/leads/LeadsView';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function LeadsPage() {
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

  // Parallel fetch initial data on the server
  const [initialLeads, metadata] = await Promise.all([
    getLeads({ companyId }),
    getLeadsMetadata(companyId)
  ]);

  return (
    <LeadsView 
      activeCompany={activeCompany} 
      activeView="leads" 
      user={user as any}
      initialLeads={initialLeads}
      metadata={metadata}
    />
  );
}
