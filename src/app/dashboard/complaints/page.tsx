import { createClient } from '@/lib/supabase-server';
import { getSupportTickets, getSupportMetadata } from '@/lib/services/support';
import { ComplaintsView } from '@/components/features/complaints/ComplaintsView';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function ComplaintsPage() {
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

  const [initialTickets, metadata] = await Promise.all([
    getSupportTickets({ companyId, filterType: 'complaint' }),
    getSupportMetadata(companyId)
  ]);

  return (
    <ComplaintsView 
      activeCompany={activeCompany} 
      activeView="complaints" 
      user={user as any}
      initialTickets={initialTickets}
      metadata={metadata}
    />
  );
}
