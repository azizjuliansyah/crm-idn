import { useState, useMemo } from 'react';
import { Quotation } from '@/lib/types';

export type SortKey = 'number' | 'client' | 'date' | 'total' | 'status';
export type SortConfig = { key: SortKey; direction: 'asc' | 'desc' } | null;

/**
 * Custom hook to manage filtration, searching, and sorting of quotations.
 * Centralizing this logic makes the view component cleaner and the logic reusable.
 */
export function useQuotationFilters(quotations: Quotation[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClientId, setFilterClientId] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });

  const filteredQuotations = useMemo(() => {
    // Server-side filtering is now handled in useQuotationsQuery.
    return quotations;
  }, [quotations]);

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
    sortConfig,
    setSortConfig,
    filteredQuotations,
    handleSort
  };
}
