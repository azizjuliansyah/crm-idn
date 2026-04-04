'use client';

import React from 'react';
import { 
  Subtext,
  Label,
  Checkbox
} from '@/components/ui';
import { ClientCompany, ClientCompanyCategory } from '@/lib/types';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { 
  Edit2, 
  Trash2, 
  MapPin, 
  Mail, 
  Phone
} from 'lucide-react';
import { BaseDataTable, ColumnConfig } from '@/components/shared/tables/BaseDataTable';

interface Props {
  items: ClientCompany[];
  categories: ClientCompanyCategory[];
  selectedIds: number[];
  onToggleSelect: (id: string | number) => void;
  onToggleSelectAll: () => void;
  onEdit: (item: ClientCompany) => void;
  onDelete: (id: number, name: string) => void;
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
  onSort: (key: string) => void;
  
  // Pagination
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isLoading?: boolean;
}

export const ClientCompaniesTableView: React.FC<Props> = ({
  items,
  categories,
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
  const columns: ColumnConfig<ClientCompany>[] = [
    {
      header: 'Nama Perusahaan',
      key: 'name',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm border border-indigo-100 text-xs font-bold uppercase">
            {item.name?.charAt(0) || '?'}
          </div>
          <div className="min-w-0">
            <Subtext className="text-sm text-gray-900 font-medium truncate uppercase">{item.name}</Subtext>
            <Subtext className="text-[10px] text-gray-400 capitalize mt-1 flex items-center gap-1 truncate">
              <MapPin size={10} /> {item.address || '-'}
            </Subtext>
          </div>
        </div>
      )
    },
    {
      header: 'Kategori',
      key: 'category_id',
      sortable: true,
      render: (item) => {
        const itemCategory = categories.find(c => c.id === item.category_id);
        return (
          <Label className="px-3 py-1 bg-white border border-gray-100 rounded-full text-[9px] uppercase text-gray-500 shadow-sm">
            {itemCategory?.name || 'UMUM'}
          </Label>
        );
      }
    },
    {
      header: 'Kontak',
      key: 'contact',
      render: (item) => (
        <div className="space-y-1">
          <Subtext className="text-[10px] text-gray-600 flex items-center gap-2 lowercase">
            <Mail size={12} className="text-gray-300" /> {item.email || '-'}
          </Subtext>
          <Subtext className="text-[10px] text-gray-600 flex items-center gap-2">
            <Phone size={12} className="text-gray-300" /> {item.whatsapp || '-'}
          </Subtext>
        </div>
      )
    },
    {
      header: 'Aksi',
      key: 'actions',
      headerClassName: 'text-center',
      className: 'text-center',
      render: (item) => (
        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <ActionButton icon={Edit2} variant="blue" onClick={() => onEdit(item)} title="Edit" />
          <ActionButton icon={Trash2} variant="rose" onClick={() => onDelete(item.id, item.name)} title="Hapus" />
        </div>
      )
    }
  ];

  return (
    <BaseDataTable
      data={items}
      columns={columns}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onToggleSelectAll={onToggleSelectAll}
      sortConfig={sortConfig}
      onSort={onSort}
      
      page={page}
      pageSize={pageSize}
      totalCount={totalCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      isLoading={isLoading}
      
      emptyMessage="Belum ada data perusahaan terdaftar"
      emptyIcon={null} // Factory icon from lucide-react should be passed if possible, but null is fine for now
    />
  );
};
