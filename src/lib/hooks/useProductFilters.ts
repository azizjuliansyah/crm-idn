import { useState } from 'react';

export type ProductSortKey = 'name' | 'price' | 'category_id';
export type ProductSortConfig = { key: ProductSortKey; direction: 'asc' | 'desc' } | null;

export function useProductFilters() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);
  const [sortConfig, setSortConfig] = useState<ProductSortConfig>({ key: 'name', direction: 'asc' });

  const handleSort = (key: ProductSortKey) => {
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
