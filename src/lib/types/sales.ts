import type { Profile } from './auth';
import type { Client, ClientCompany } from './client';
import type { UrgencyLevel } from './system';
import type { Quotation } from './finance';

export interface LeadSource {
  id: string;
  company_id: number;
  name: string;
}

export interface LeadStage {
  id: string;
  company_id: number;
  name: string;
  sort_order: number;
  is_system?: boolean;
}

export interface Lead {
  id: number;
  company_id: number;
  salutation?: string;
  name: string;
  email?: string;
  whatsapp?: string;
  client_company_id?: number | null;
  address?: string;
  expected_value?: number;
  source?: string;
  status: string;
  kanban_order?: number;
  sales_id?: string;
  notes?: string;
  input_date?: string;
  created_at: string;
  sales_profile?: Profile;
  client_company?: ClientCompany;
  is_urgent?: boolean;
  urgency_id?: number | null;
  urgency_level?: UrgencyLevel;
}

export interface PipelineStage {
  id: string;
  pipeline_id: number;
  name: string;
  sort_order: number;
}

export interface Pipeline {
  id: number;
  company_id: number;
  name: string;
  stages?: PipelineStage[];
  has_urgency?: boolean;
}

export interface Deal {
  id: number;
  company_id: number;
  pipeline_id: number;
  stage_id: string;
  kanban_order?: number;
  client_id?: number | null;
  name: string;
  customer_company?: string;
  contact_name?: string;
  email?: string;
  whatsapp?: string;
  expected_value?: number;
  probability?: number;
  follow_up?: number;
  follow_up_date?: string | null;
  follow_up_notes?: string | null;
  sales_id?: string;
  source?: string;
  notes?: string;
  input_date?: string;
  created_at: string;
  sales_profile?: Profile;
  client?: Client;
  quotations?: Quotation | Quotation[];
  is_urgent?: boolean;
  urgency_id?: number | null;
  urgency_level?: UrgencyLevel;
}

export interface SalesRequestCategory {
  id: number;
  company_id: number;
  name: string;
  sort_order: number;
  created_at: string;
  has_urgency?: boolean;
}

export interface SalesRequest {
  id: number;
  company_id: number;
  category_id: number;
  requester_id: string;
  client_id: number;
  quotation_id?: number | null;
  proforma_id?: number | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  notes?: string;
  created_at: string;
  is_urgent?: boolean;
  urgency_id?: number | null;
  profile?: Profile;
  client?: Client;
  category?: SalesRequestCategory;
  quotation?: { id: number, number: string };
  proforma?: { id: number, number: string };
  urgency_level?: UrgencyLevel;
}
