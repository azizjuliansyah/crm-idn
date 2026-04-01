
// Existing interfaces
export interface SopStep {
  id?: number;
  sop_id?: number;
  sort_order: number;
  flow_type: 'start' | 'process' | 'decision' | 'end' | 'sambungan' | 'alur_baru';
  step_name?: string;
  responsible_role: string;
  description: string;
  related_documents?: string;
  created_at?: string;
  yes_target_step?: number | null;
  no_target_step?: number | null;
  next_target_step?: number | null;
}

export interface Sop {
  id: number;
  company_id: number;
  category_id: number | null;
  title: string;
  document_number: string;
  purpose?: string;
  reference?: string;
  scope?: string;
  definition?: string;
  kpi_indicator?: string;
  prepared_by?: string;
  checked_by?: string;
  approved_by?: string;
  revision_number: number;
  revision_date: string;
  status: 'Draft' | 'Approved';
  is_archived: boolean;
  created_at: string;
  sop_categories?: SopCategory;
  sop_steps?: SopStep[];
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  platform_role: 'USER' | 'ADMIN';
  whatsapp?: string;
  avatar_url?: string;
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

export interface Pipeline {
  id: number;
  company_id: number;
  name: string;
  stages?: PipelineStage[];
  has_urgency?: boolean;
}

export interface PipelineStage {
  id: string;
  pipeline_id: number;
  name: string;
  sort_order: number;
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

export interface Client {
  id: number;
  company_id: number;
  client_company_id?: number | null;
  salutation?: string;
  name: string;
  email?: string;
  whatsapp?: string;
  address?: string;
  created_at: string;
  client_company?: ClientCompany;
}

export type ClientWithCompany = Client;

export interface ClientCompany {
  id: number;
  company_id: number;
  category_id: number | null;
  name: string;
  address?: string;
  email?: string;
  whatsapp?: string;
  client_company_categories?: ClientCompanyCategory;
}

export interface ClientCompanyCategory {
  id: number;
  company_id: number;
  name: string;
}

export interface UrgencyLevel {
  id: number;
  company_id: number;
  name: string;
  color?: string;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: number;
  company_id: number;
  category_id?: number | null;
  unit_id?: number | null;
  name: string;
  price: number;
  description?: string;
  created_at: string;
  product_categories?: ProductCategory;
  product_units?: ProductUnit;
}

export interface ProductCategory {
  id: number;
  company_id: number;
  name: string;
}

export interface ProductUnit {
  id: number;
  company_id: number;
  name: string;
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

export interface Quotation {
  id: number;
  company_id: number;
  client_id: number;
  deal_id?: number | null;
  number: string;
  status: string;
  date: string;
  expiry_date: string;
  notes?: string;
  subtotal: number;
  discount_type: 'Rp' | '%';
  discount_value: number;
  tax_type?: string;
  tax_value: number;
  total: number;
  created_at: string;
  client?: Client;
  quotation_items?: QuotationItem[];
}

export interface QuotationItem {
  id: number;
  quotation_id: number;
  product_id?: number | null;
  description?: string;
  qty: number;
  unit_name?: string;
  price: number;
  total: number;
  products?: Product;
}

export interface ProformaInvoice {
  id: number;
  company_id: number;
  client_id: number;
  quotation_id?: number | null;
  number: string;
  status: string;
  date: string;
  due_date: string;
  notes?: string;
  subtotal: number;
  discount_type: 'Rp' | '%';
  discount_value: number;
  tax_type?: string;
  tax_value: number;
  total: number;
  created_at: string;
  client?: Client;
  proforma_items?: ProformaItem[];
}

export interface ProformaItem {
  id: number;
  proforma_id: number;
  product_id?: number | null;
  description?: string;
  qty: number;
  unit_name?: string;
  price: number;
  total: number;
  products?: Product;
}

export interface Invoice {
  id: number;
  company_id: number;
  client_id: number;
  proforma_id?: number | null;
  quotation_id?: number | null;
  number: string;
  status: string;
  date: string;
  due_date: string;
  notes?: string;
  subtotal: number;
  discount_type: 'Rp' | '%';
  discount_value: number;
  tax_type?: string;
  tax_value: number;
  total: number;
  created_at: string;
  client?: Client;
  invoice_items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  product_id?: number | null;
  description?: string;
  qty: number;
  unit_name?: string;
  price: number;
  total: number;
  products?: Product;
}

export interface InvoiceRequest {
  id: number;
  company_id: number;
  requester_id: string;
  client_id: number;
  quotation_id?: number | null;
  proforma_id?: number | null;
  invoice_id?: number | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  notes?: string;
  created_at: string;
  is_urgent?: boolean;
  urgency_id?: number | null;
  profile?: Profile;
  client?: Client;
  quotation?: { number: string };
  proforma?: { number: string };
  invoice?: { id: number, number: string };
  urgency_level?: UrgencyLevel;
}

export interface Kwitansi {
  id: number;
  company_id: number;
  client_id: number;
  invoice_id?: number | null;
  number: string;
  status: string;
  date: string;
  notes?: string;
  subtotal: number;
  discount_type: 'Rp' | '%';
  discount_value: number;
  tax_type?: string;
  tax_value: number;
  total: number;
  created_at: string;
  client?: Client;
  kwitansi_items?: KwitansiItem[];
}

export interface KwitansiItem {
  id: number;
  kwitansi_id: number;
  product_id?: number | null;
  description?: string;
  qty: number;
  unit_name?: string;
  price: number;
  total: number;
  products?: Product;
}

export interface KwitansiRequest {
  id: number;
  company_id: number;
  requester_id: string;
  client_id: number;
  invoice_id?: number | null;
  proforma_id?: number | null;
  kwitansi_id?: number | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  notes?: string;
  created_at: string;
  is_urgent?: boolean;
  urgency_id?: number | null;
  profile?: Profile;
  client?: Client;
  invoice?: { id: number, number: string };
  proforma?: { id: number, number: string };
  kwitansi?: { id: number, number: string };
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

export interface DocumentTemplateSetting {
  id: number;
  company_id: number;
  document_type: 'quotation' | 'invoice' | 'proforma' | 'kwitansi';
  template_id: string;
  config: any;
  updated_at: string;
}

export interface ProjectPipeline {
  id: number;
  company_id: number;
  name: string;
  custom_fields?: ProjectCustomField[];
  stages?: ProjectPipelineStage[];
}

export interface ProjectPipelineStage {
  id: string;
  pipeline_id: number;
  name: string;
  sort_order: number;
}

export interface ProjectCustomField {
  label: string;
  type: 'text' | 'number' | 'date';
}

export interface Project {
  id: number;
  company_id: number;
  pipeline_id: number;
  stage_id: string;
  client_id?: number | null;
  lead_id?: string | null;
  name: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  custom_field_values?: Record<string, any>;
  created_at: string;
  client?: Client;
  lead_profile?: Profile;
  team_members?: { user_id: string; profile?: Profile }[];
}

export interface TaskStage {
  id: string;
  company_id: number;
  name: string;
  sort_order: number;
}

export interface Task {
  id: number;
  company_id: number;
  project_id: number;
  stage_id: string;
  assigned_id?: string | null;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  assigned_profile?: Profile;
}

export interface SupportStage {
  id: number;
  company_id: number;
  name: string;
  sort_order: number;
  is_system?: boolean;
}

export interface SupportTicket {
  id: number;
  company_id: number;
  client_id: number | null;
  assigned_id?: string | null;
  topic_id?: number | null;
  kanban_order?: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  type: 'ticket' | 'complaint';
  created_at: string;
  client?: Client;
  assigned_profile?: Profile;
  ticket_topics?: TicketTopic;
}

export interface KbCategory {
  id: number;
  company_id: number;
  name: string;
  }

export interface KbArticle {
  id: number;
  company_id: number;
  category_id?: number | null;
  title: string;
  content: string;
  created_at: string;
  kb_categories?: KbCategory;
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

export interface SopCategory {
  id: number;
  company_id: number;
  name: string;
  parent_id: number | null;
  sort_order: number;
}

export interface TicketTopic {
  id: number;
  company_id: number;
  name: string;
  description?: string;
  created_at: string;
}

export interface ClientForm {
  salutation: string;
  name: string;
  email: string;
  whatsapp: string;
  client_company_id: string;
}

export interface ProductForm {
  name: string;
  category_id: string;
  unit_id: string;
  price: number;
  description: string;
}
