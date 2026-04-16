import type { Profile } from './auth';
import type { Client } from './client';

export interface ProjectCustomField {
  label: string;
  type: 'text' | 'number' | 'date';
}

export interface ProjectPipelineStage {
  id: string;
  pipeline_id: number;
  name: string;
  sort_order: number;
}

export interface ProjectPipeline {
  id: number;
  company_id: number;
  name: string;
  custom_fields?: ProjectCustomField[];
  stages?: ProjectPipelineStage[];
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
