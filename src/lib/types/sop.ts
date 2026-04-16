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

export interface SopCategory {
  id: number;
  company_id: number;
  name: string;
  parent_id: number | null;
  sort_order: number;
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
