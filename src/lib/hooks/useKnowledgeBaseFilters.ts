import { useState, useMemo } from 'react';

export type KbSortKey = 'title' | 'category_id' | 'created_at';
export type KbSortConfig = { key: KbSortKey; direction: 'asc' | 'desc' } | null;

export function useKnowledgeBaseFilters() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);
  const [sortConfig, setSortConfig] = useState<KbSortConfig>({ key: 'created_at', direction: 'desc' });

  const handleSort = (key: KbSortKey) => {
    setSortConfig(prev => {
      if (prev?.key === key) return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      return { key, direction: 'asc' };
    });
  };

  return {
    searchTerm,
    setSearchTerm,
    filterCategoryId,
    setFilterCategoryId,
    sortConfig,
    setSortConfig,
    handleSort
  };
}
