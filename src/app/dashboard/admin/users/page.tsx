import { getAllCompanies, getAllUsers } from '@/lib/services/admin';
import { AdminUsersView } from '@/components/features/admin/AdminUsersView';

export default async function AdminUsersPage() {
  const [companies, users] = await Promise.all([
    getAllCompanies(),
    getAllUsers()
  ]);
  
  return <AdminUsersView initialUsers={users} allCompanies={companies} />;
}
