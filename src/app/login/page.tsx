
import { LoginView } from '@/components/LoginView';
import { supabase } from '@/lib/supabase';

export default async function LoginPage() {
  const { data } = await supabase.from('platform_settings').select('*').single();
  
  // Default fallback if no settings found
  const settings = data || { name: 'CRM Platform', is_singleton: false };

  return <LoginView platformSettings={settings} />;
}
