import type { Profile } from './auth';

export interface UrgencyLevel {
  id: number;
  company_id: number;
  name: string;
  color?: string;
  sort_order: number;
  created_at: string;
}

export interface PlatformSettings {
  name: string;
  logo_url?: string;
  mailketing_api_token?: string;
  mailketing_from_name?: string;
  mailketing_from_email?: string;
  hcaptcha_enabled?: boolean;
  hcaptcha_site_key?: string;
  is_singleton?: boolean;
}

export interface TaxSetting {
  id: number;
  company_id: number;
  name: string;
  rate: number;
  is_active: boolean;
  is_default: boolean;
}

export interface AutonumberSetting {
  id: number;
  company_id: number;
  document_type: 'quotation' | 'proforma' | 'delivery_order' | 'invoice' | 'kwitansi';
  prefix: string;
  format_pattern: string;
  next_number: number;
  digit_count: number;
  reset_period: 'never' | 'monthly' | 'yearly';
  reset_day?: number;
  reset_month?: number;
  last_reset_date?: string;
}

export interface DocumentTemplateSetting {
  id: number;
  company_id: number;
  document_type: 'quotation' | 'invoice' | 'proforma' | 'kwitansi';
  template_id: string;
  config: any;
  updated_at: string;
}

export interface AiSetting {
  id: number;
  company_id: number;
  gemini_api_key?: string;
  model_name?: string;
  system_instruction?: string;
  updated_at: string;
}

export interface CompanyEmailSetting {
  id: number;
  company_id: number;
  mailketing_api_token?: string;
  mailketing_from_name?: string;
  mailketing_from_email?: string;
  updated_at: string;
}

export interface LogActivity {
  id: number;
  lead_id?: number | null;
  deal_id?: number | null;
  ticket_id?: number | null;
  user_id: string;
  content: string;
  activity_type: 'comment' | 'status_change' | 'system';
  created_at: string;
  profile?: Profile;
}
