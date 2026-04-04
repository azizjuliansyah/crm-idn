import React from 'react';
import { ComboBox } from '@/components/ui';
import { ProductCategory } from '@/lib/types';

interface ProductFilterBarProps {
  filterCategoryId: number | null;
  setFilterCategoryId: (val: number | null) => void;
  categories: ProductCategory[];
}

export const ProductFilterBar: React.FC<ProductFilterBarProps> = ({
  filterCategoryId,
  setFilterCategoryId,
  categories,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-4 shrink-0">

      <div className="flex items-center gap-3 shrink-0 ml-auto">
        <ComboBox
          value={filterCategoryId || 'all'}
          onChange={(val: string | number) => setFilterCategoryId(val === 'all' ? null : Number(val))}
          placeholder="Kategori"
          options={[
            { value: 'all', label: 'SEMUA KATEGORI' },
            ...categories.map(c => ({ value: c.id, label: c.name.toUpperCase() }))
          ]}
          className="w-56"
          placeholderSize="text-[10px] font-bold text-gray-900 uppercase "
        />
      </div>
    </div>
  );
};
