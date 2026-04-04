'use client';

import React from 'react';
import { 
  Subtext,
  Label,
} from '@/components/ui';
import { Client, ClientWithCompany } from '@/lib/types';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { 
  Edit2, 
  Trash2, 
  Contact, 
  Building, 
  Mail, 
  Phone
} from 'lucide-react';
import { BaseDataTable, ColumnConfig } from '@/components/shared/tables/BaseDataTable';

interface Props {
  clients: ClientWithCompany[];
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onEdit: (client: Client) => void;
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

export const ClientsTableView: React.FC<Props> = ({
  clients,
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
  const columns: ColumnConfig<ClientWithCompany>[] = [
    {
      header: 'ID',
      key: 'id',
      sortable: true,
      className: 'w-20 font-mono text-[11px] text-gray-400 py-5 px-6',
      render: (item) => `#${String(item.id).padStart(4, '0')}`
    },
    {
      header: 'Client / Kontak',
      key: 'name',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-[10px] font-bold">
            {item.name.charAt(0)}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 group-hover:text-emerald-600 transition-colors">
              {item.salutation && <span className="text-emerald-500 mr-1">{item.salutation}</span>}
              {item.name}
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Perusahaan',
      key: 'client_company_id',
      sortable: true,
      render: (item) => item.client_company ? (
        <div className="flex items-center gap-2">
          <Building size={12} className="text-indigo-400" />
          <Label className="text-[11px] text-indigo-600 uppercase font-semibold leading-none">{item.client_company.name}</Label>
        </div>
      ) : (
        <span className="text-[9px] uppercase text-gray-300 italic font-medium">Personal</span>
      )
    },
    {
      header: 'Kontak Detail',
      key: 'contact_details',
      render: (item) => (
        <div className="space-y-1">
          {item.email && (
            <div className="text-[10px] text-gray-600 flex items-center gap-2">
              <Mail size={12} className="text-gray-300 shrink-0" /> 
              <span className="truncate max-w-[150px]">{item.email}</span>
            </div>
          )}
          {item.whatsapp && (
            <div className="text-[10px] text-gray-600 flex items-center gap-2">
              <Phone size={12} className="text-gray-300 shrink-0" /> 
              <span>{item.whatsapp}</span>
            </div>
          )}
          {!item.email && !item.whatsapp && <span className="text-[10px] text-gray-300 italic">-</span>}
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
    <div className="h-[75vh] mb-4">
      <BaseDataTable
        data={clients}
        columns={columns}
        selectedIds={selectedIds}
        onToggleSelect={(id) => onToggleSelect(Number(id))}
        onToggleSelectAll={onToggleSelectAll}
        sortConfig={sortConfig}
        onSort={onSort}
        
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        isLoading={isLoading}
        
        emptyMessage="Belum ada data client"
        emptyIcon={<Contact size={48} className="mx-auto opacity-10 text-gray-400" />}
      />
    </div>
  );
};
