import { getAllCompanies, getAllUsers } from '@/lib/services/admin';
import { AdminCompaniesView } from '@/components/features/admin/AdminCompaniesView';

export default async function AdminCompaniesPage() {
  const [companies, users] = await Promise.all([
    getAllCompanies(),
    getAllUsers()
  ]);
  
  return <AdminCompaniesView initialCompanies={companies} allUsers={users} />;
}
