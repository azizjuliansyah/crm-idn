import { createClient } from '@/lib/supabase-server';
import { getClients, getClientsMetadata } from '@/lib/services/clients';
import { ClientsView } from '@/components/features/clients/ClientsView';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function ClientsPage() {
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

  const [initialClients, metadata] = await Promise.all([
    getClients({ companyId }),
    getClientsMetadata(companyId)
  ]);

  return (
    <ClientsView 
      company={activeCompany} 
      initialClients={initialClients}
      metadata={metadata}
    />
  );
}
