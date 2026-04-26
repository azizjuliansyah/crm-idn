import { createClient } from '@/lib/supabase-server';
import { SupportTicket, SupportStage, Client, CompanyMember, TicketTopic } from '@/lib/types';

export async function getSupportTickets(params: {
  companyId: string | number;
  searchTerm?: string;
  filterStatus?: string;
  filterClientId?: string;
  filterTopicId?: string;
  filterType?: string;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  page?: number;
  pageSize?: number;
}) {
  const {
    companyId,
    searchTerm,
    filterStatus,
    filterClientId,
    filterTopicId,
    filterType,
    sortConfig,
    page = 1,
    pageSize = 20,
  } = params;

  const supabase = await createClient();
  let query = supabase
    .from('support_tickets')
    .select('*, assigned_profile:profiles(*), client:clients(*), ticket_topics(*)', { count: 'exact' })
    .eq('company_id', companyId);

  if (searchTerm) {
    query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
  }

  if (filterStatus && filterStatus !== 'all') {
    query = query.eq('status', filterStatus);
  }

  if (filterClientId && filterClientId !== 'all') {
    query = query.eq('client_id', filterClientId);
  }

  if (filterTopicId && filterTopicId !== 'all') {
    query = query.eq('topic_id', filterTopicId);
  }

  if (filterType) {
    query = query.eq('type', filterType);
  }

  if (sortConfig) {
    query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
  } else {
    query = query.order('id', { ascending: false });
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  return {
    data: data as SupportTicket[],
    totalCount: count || 0,
  };
}

export async function getSupportMetadata(companyId: number) {
  const supabase = await createClient();

  const [stagesRes, clientsRes, membersRes, topicsRes] = await Promise.all([
    supabase.from('support_stages').select('*').eq('company_id', companyId).order('sort_order', { ascending: true }),
    supabase.from('clients').select('*').eq('company_id', companyId).order('name'),
    supabase.from('company_members').select('*, profile:profiles(*)').eq('company_id', companyId),
    supabase.from('ticket_topics').select('*').eq('company_id', companyId).order('name')
  ]);

  return {
    stages: (stagesRes.data || []) as SupportStage[],
    clients: (clientsRes.data || []) as Client[],
    members: (membersRes.data || []) as CompanyMember[],
    topics: (topicsRes.data || []) as TicketTopic[]
  };
}
