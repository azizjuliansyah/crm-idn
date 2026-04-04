import { useState, useMemo } from 'react';

export type SopSortKey = 'title' | 'document_number' | 'revision_number' | 'status' | 'created_at';
export type SopSortConfig = { key: SopSortKey; direction: 'asc' | 'desc' } | null;

export function useSopFilters() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SopSortConfig>({ key: 'document_number', direction: 'asc' });

  const handleSort = (key: SopSortKey) => {
    setSortConfig(prev => {
      if (prev?.key === key) return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      return { key, direction: 'asc' };
    });
  };

  return {
    searchTerm,
    setSearchTerm,
    sortConfig,
    setSortConfig,
    handleSort
  };
}
