export interface Profile {
  id: string;
  email: string;
  full_name: string;
  platform_role: 'USER' | 'ADMIN';
  whatsapp?: string;
  avatar_url?: string;
  created_at?: string;
  is_suspended?: boolean;
}
