import { getAdminDashboardStats } from '@/lib/services/admin';
import { AdminDashboardOverview } from '@/components/features/admin/AdminDashboardOverview';

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();
  
  return <AdminDashboardOverview stats={stats} />;
}
