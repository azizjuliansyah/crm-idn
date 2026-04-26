import { getPlatformSettings } from '@/lib/services/admin';
import { AdminEmailSettingsView } from '@/components/features/admin/AdminEmailSettingsView';

export default async function AdminEmailSettingsPage() {
  const settings = await getPlatformSettings();
  
  return <AdminEmailSettingsView initialSettings={settings} />;
}
