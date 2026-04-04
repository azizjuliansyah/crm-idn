import { useState, useMemo } from 'react';
import { Deal } from '@/lib/types';

/**
 * Custom hook to manage searching, filtering, and sorting for Deals.
 */
export function useDealFilters(deals: Deal[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [probabilityFilter, setProbabilityFilter] = useState('all');
  const [dateFilterType, setDateFilterType] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [followUpFilter, setFollowUpFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

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
    probabilityFilter, setProbabilityFilter,
    dateFilterType, setDateFilterType,
    startDateFilter, setStartDateFilter,
    endDateFilter, setEndDateFilter,
    followUpFilter, setFollowUpFilter,
    sortConfig, setSortConfig,
    handleSort
  };
}
