import { useState, useMemo } from 'react';
import { Lead } from '@/lib/types';

/**
 * Custom hook to manage searching, filtering, and sorting for Leads.
 * Centralizing this state simplifies the main view component.
 */
export function useLeadFilters(leads: Lead[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [dateFilterType, setDateFilterType] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const filteredLeads = useMemo(() => {
    // Note: Server-side filters are prioritized in fetchLeads.
    // Client-side filters could be added here if needed, but for now we follow the existing pattern
    // of letting supabase handle major filters and this hook handles the state.
    return leads;
  }, [leads]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return {
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    assigneeFilter, setAssigneeFilter,
    companyFilter, setCompanyFilter,
    dateFilterType, setDateFilterType,
    startDateFilter, setStartDateFilter,
    endDateFilter, setEndDateFilter,
    sortConfig, setSortConfig,
    filteredLeads,
    handleSort
  };
}
