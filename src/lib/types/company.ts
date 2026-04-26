import type { Profile } from './auth';

export interface Package {
  id: number;
  name: string;
  max_members: number;
  created_at?: string;
}

export interface Company {
  id: number;
  name: string;
  address: string;
  logo_url?: string;
  created_at?: string;
  has_lead_urgency?: boolean;
  has_invoice_urgency?: boolean;
  has_kwitansi_urgency?: boolean;
  package_id?: number | null;
  packages?: Package;
  is_suspended?: boolean;
}

export interface CompanyRole {
  id: string;
  company_id: number;
  name: string;
  permissions: string[];
  is_system?: boolean;
}

export interface CompanyMember {
  id: string;
  company_id: number;
  user_id: string;
  role_id: string | null;
  profile?: Profile;
  company_roles?: CompanyRole;
}
