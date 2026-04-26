import { createClient } from '@/lib/supabase-server';
import { PlatformSettings } from '../types';

export async function getAdminDashboardStats() {
  const supabase = await createClient();
  
  const [companies, users] = await Promise.all([
    supabase.from('companies').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true })
  ]);

  return {
    companiesCount: companies.count || 0,
    usersCount: users.count || 0,
  };
}

export async function getPlatformSettings() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('platform_settings')
    .select('*')
    .eq('is_singleton', true)
    .maybeSingle();
    
  return data as PlatformSettings | null;
}

export async function getAllCompanies() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });
  return data || [];
}

export async function getAllUsers() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  return data || [];
}
