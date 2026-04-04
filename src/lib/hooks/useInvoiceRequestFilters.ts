import { useState, useCallback } from 'react';

export function useInvoiceRequestFilters() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({
    key: 'id',
    direction: 'desc',
  });

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setFilterStatus('all');
    setSortConfig({ key: 'id', direction: 'desc' });
  }, []);

  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    sortConfig,
    setSortConfig,
    handleSort,
    resetFilters,
  };
}
