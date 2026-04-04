import { useState, useMemo } from 'react';

export type SortKey = 'id' | 'client' | 'status' | 'created_at';
export type SortConfig = { key: SortKey; direction: 'asc' | 'desc' } | null;

export function useSalesRequestFilters() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id', direction: 'desc' });

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => {
      if (prev?.key === key) return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      return { key, direction: 'asc' };
    });
  };

  return {
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    sortConfig,
    setSortConfig,
    handleSort
  };
}
