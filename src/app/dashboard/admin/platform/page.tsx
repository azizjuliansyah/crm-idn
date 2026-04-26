import { getPlatformSettings } from '@/lib/services/admin';
import { AdminPlatformSettingsView } from '@/components/features/admin/AdminPlatformSettingsView';

export default async function AdminPlatformSettingsPage() {
  const settings = await getPlatformSettings();
  
  return <AdminPlatformSettingsView initialSettings={settings} />;
}
