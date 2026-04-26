import { getAllPackages } from '@/lib/services/admin';
import { AdminPackagesView } from '@/components/features/admin/AdminPackagesView';

export default async function AdminPackagesPage() {
  const packages = await getAllPackages();
  
  return <AdminPackagesView initialPackages={packages} />;
}
