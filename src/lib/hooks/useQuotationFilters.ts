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
    let result = [...quotations];

    // Note: Server-side filtering is already handled in fetchQuotations, 
    // but client-side sorting and additional filtering can happen here if needed.
    // Currently, we'll keep the sorting logic here as per the original implementation.

    if (sortConfig) {
      result.sort((a, b) => {
        let valA: any, valB: any;
        switch (sortConfig.key) {
          case 'number': valA = a.number; valB = b.number; break;
          case 'client': valA = a.client?.name || ''; valB = b.client?.name || ''; break;
          case 'date': valA = a.date; valB = b.date; break;
          case 'total': valA = a.total; valB = b.total; break;
          case 'status': valA = a.status; valB = b.status; break;
          default: valA = a.id; valB = b.id;
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [quotations, sortConfig]);

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
