import React, { useMemo } from 'react';
import { Package, Edit2, Trash2 } from 'lucide-react';
import { Product } from '@/lib/types';
import { BaseDataTable, ColumnConfig } from '@/components/shared/tables/BaseDataTable';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { Subtext, Label } from '@/components/ui';
import { formatIDR } from '@/lib/utils/formatters';

interface ProductsTableViewProps {
  data: Product[];
  selectedIds: number[];
  onToggleSelect: (id: string | number) => void;
  onToggleSelectAll: () => void;
  onEdit: (product: Product) => void;
  onDelete: (id: number, name: string) => void;
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
  onSort: (key: string) => void;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  isLoading: boolean;
}

export const ProductsTableView: React.FC<ProductsTableViewProps> = ({
  data,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
  sortConfig,
  onSort,
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  isLoading
}) => {
  const columns: ColumnConfig<Product>[] = useMemo(() => [
    {
      header: 'ID',
      key: 'id',
      sortable: true,
      className: 'w-20 font-mono text-[11px] text-gray-400 py-5 px-6',
      render: (item: Product) => `#${String(item.id).padStart(4, '0')}`
    },
    {
      header: 'Informasi Produk',
      key: 'name',
      sortable: true,
      className: 'py-5 px-6',
      render: (item: Product) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm border border-emerald-100 shrink-0">
            <Package size={20} strokeWidth={2.5} />
          </div>
          <div className="min-w-0 text-left">
            <Subtext className="text-sm text-gray-900 font-bold truncate">{item.name}</Subtext>
            {item.description && (
              <Subtext className="text-[10px] text-gray-400 uppercase italic line-clamp-1 truncate">
                {item.description}
              </Subtext>
            )}
          </div>
        </div>
      )
    },
    {
      header: 'Kategori',
      key: 'category_id',
      sortable: true,
      className: 'py-5 px-6',
      render: (item: Product) => (
        <Label className="px-3 py-1 bg-white border border-gray-100 rounded-full text-[9px] uppercase text-gray-500 shadow-sm">
          {item.product_categories?.name || 'Umum'}
        </Label>
      )
    },
    {
      header: 'Satuan',
      key: 'unit_id',
      sortable: false,
      className: 'py-5 px-6',
      render: (item: Product) => (
        <Label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{item.product_units?.name || '-'}</Label>
      )
    },
    {
      header: 'Harga Jual',
      key: 'price',
      sortable: true,
      headerClassName: 'text-right',
      className: 'text-right py-5 px-6 font-bold text-gray-900',
      render: (item: Product) => formatIDR(item.price)
    },
    {
      header: 'Aksi',
      key: 'actions' as any,
      headerClassName: 'text-center',
      className: 'text-center py-5 px-6',
      render: (item: Product) => (
        <div className="flex items-center justify-center gap-2">
          <ActionButton
            icon={Edit2}
            variant="blue"
            onClick={() => onEdit(item)}
            title="Edit"
          />
          <ActionButton
            icon={Trash2}
            variant="rose"
            onClick={() => onDelete(item.id, item.name)}
            title="Hapus"
          />
        </div>
      )
    }
  ], [onEdit, onDelete]);

  return (
    <BaseDataTable
      data={data}
      columns={columns}
      sortConfig={sortConfig}
      onSort={onSort as (key: string) => void}
      page={page}
      pageSize={pageSize}
      totalCount={totalCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      isLoading={isLoading}
      emptyMessage="Katalog produk masih kosong"
      emptyIcon={<Package size={48} />}
      
      // Selection Props
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onToggleSelectAll={onToggleSelectAll}
    />
  );
};
