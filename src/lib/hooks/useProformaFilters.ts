import { useState, useMemo } from 'react';
import { ProformaInvoice } from '@/lib/types';

export type SortKey = 'number' | 'client' | 'date' | 'total' | 'status';
export type SortConfig = { key: SortKey; direction: 'asc' | 'desc' } | null;

/**
 * Custom hook to manage filtration, searching, and sorting of proforma invoices.
 */
export function useProformaFilters(proformas: ProformaInvoice[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClientId, setFilterClientId] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });

  const filteredProformas = useMemo(() => {
    // Server-side filtering is now handled in useProformasQuery.
    return proformas;
  }, [proformas]);

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
    filteredProformas,
    handleSort
  };
}
