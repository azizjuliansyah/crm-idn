import { getAllCompanies, getAllUsers, getAllPackages } from '@/lib/services/admin';
import { AdminCompaniesView } from '@/components/features/admin/AdminCompaniesView';

export default async function AdminCompaniesPage() {
  const [companies, users, packages] = await Promise.all([
    getAllCompanies(),
    getAllUsers(),
    getAllPackages()
  ]);
  
  return <AdminCompaniesView initialCompanies={companies} allUsers={users} allPackages={packages} />;
}
