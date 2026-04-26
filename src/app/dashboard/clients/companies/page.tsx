import { createClient } from '@/lib/supabase-server';
import { getClientCompanies, getClientsMetadata } from '@/lib/services/clients';
import { ClientCompaniesView } from '@/components/features/clients/ClientCompaniesView';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function ClientCompaniesPage() {
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

  const [initialCompanies, metadata] = await Promise.all([
    getClientCompanies({ companyId }),
    getClientsMetadata(companyId)
  ]);

  return (
    <ClientCompaniesView 
      company={activeCompany} 
      initialCompanies={initialCompanies}
      metadata={metadata}
    />
  );
}
