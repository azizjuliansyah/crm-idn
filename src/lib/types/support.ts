import type { Profile } from './auth';
import type { Client } from './client';

export interface SupportStage {
  id: number;
  company_id: number;
  name: string;
  sort_order: number;
  is_system?: boolean;
}

export interface TicketTopic {
  id: number;
  company_id: number;
  name: string;
  description?: string;
  created_at: string;
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
