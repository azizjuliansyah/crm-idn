import { ResetPasswordView } from '@/components/features/auth/ResetPasswordView';
import { supabase } from '@/lib/supabase';

export const metadata = {
  title: 'Atur Ulang Kata Sandi | CRM IDN',
  description: 'Silakan atur ulang kata sandi Anda untuk melanjutkan akses ke portal.',
};

export default async function ResetPasswordPage() {
  const { data } = await supabase.from('platform_settings').select('*').single();
  const settings = data || { name: 'CRM Platform', is_singleton: false };

  return <ResetPasswordView platformSettings={settings} />;
}
