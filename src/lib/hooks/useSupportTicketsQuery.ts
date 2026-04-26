import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { SupportTicket } from '@/lib/types';

interface UseSupportTicketsQueryParams {
  companyId: string;
  searchTerm?: string;
  filterStatus?: string;
  filterClientId?: string;
  filterTopicId?: string;
  filterType?: string; // e.g., 'ticket' or 'complaint'
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  page?: number;
  pageSize?: number;
}

export function useSupportTicketsQuery({
  companyId,
  searchTerm,
  filterStatus,
  filterClientId,
  filterTopicId,
  filterType,
  sortConfig,
  page = 1,
  pageSize = 20,
}: UseSupportTicketsQueryParams, initialData?: { data: SupportTicket[], totalCount: number }) {
  return useQuery({
    queryKey: ['support_tickets', companyId, searchTerm, filterStatus, filterClientId, filterTopicId, filterType, sortConfig, page, pageSize],
    queryFn: async () => {
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
    },
    initialData: initialData,
    placeholderData: (previousData) => previousData,
  });
}
export function useSupportTicketMutations() {
  const queryClient = useQueryClient();

  const bulkDeleteTickets = useMutation({
    mutationFn: async (ids: number[]) => {
      const { error } = await supabase.from('support_tickets').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support_tickets'] });
    },
  });

  const bulkUpdateTicketsStatus = useMutation({
    mutationFn: async ({ ids, status }: { ids: number[]; status: string }) => {
      const { error } = await supabase.from('support_tickets').update({ status }).in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support_tickets'] });
    },
  });

  return { bulkDeleteTickets, bulkUpdateTicketsStatus };
}
