import { useState, useMemo } from 'react';
import { SupportTicket } from '@/lib/types';

export type SortKey = 'title' | 'client' | 'status' | 'created_at' | 'id';
export type SortConfig = { key: SortKey; direction: 'asc' | 'desc' } | null;

/**
 * Custom hook to manage filtration, searching, and sorting of support tickets.
 */
export function useSupportTicketFilters(tickets: SupportTicket[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClientId, setFilterClientId] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTopicId, setFilterTopicId] = useState('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id', direction: 'desc' });

  const filteredTickets = useMemo(() => {
    // Server-side filtering is now handled in useSupportTicketsQuery.
    return tickets;
  }, [tickets]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => {
      if (prev?.key === key) return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      return { key, direction: 'asc' };
    });
  };

  return {
    searchTerm,
    setSearchTerm,
    filterClientId,
    setFilterClientId,
    filterStatus,
    setFilterStatus,
    filterTopicId,
    setFilterTopicId,
    sortConfig,
    setSortConfig,
    filteredTickets,
    handleSort
  };
}
