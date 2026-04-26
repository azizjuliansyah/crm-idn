import { createClient } from '@/lib/supabase-server';
import { getDeals, getDealsMetadata } from '@/lib/services/deals';
import { DealsView } from '@/components/features/deals/DealsView';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function DealsPage() {
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

  // Fetch metadata first to get the default pipeline if needed
  const metadata = await getDealsMetadata(companyId);
  const pipelineId = metadata.pipeline?.id;

  if (!pipelineId) {
    return (
      <DealsView 
        activeCompany={activeCompany} 
        activeView="deals" 
        user={user as any}
        metadata={metadata}
      />
    );
  }

  const initialDeals = await getDeals({ companyId, pipelineId });

  return (
    <DealsView 
      activeCompany={activeCompany} 
      activeView="deals" 
      user={user as any}
      pipelineId={pipelineId}
      initialDeals={initialDeals}
      metadata={metadata}
    />
  );
}
