'use client';

import React from 'react';
import { 
  Badge, 
  Subtext, 
  Label,
  Avatar, 
  ComboBox,
} from '@/components/ui';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { ActionMenu } from '@/components/shared/ActionMenu';
import { Lead } from '@/lib/types';
import { 
  Table as TableIcon, 
  Trash2, 
  Clock, 
  Zap,
  Users,
  Eye,
  MoreVertical
} from 'lucide-react';
import { formatIDR } from '@/lib/utils/formatters';
import { BaseDataTable, ColumnConfig } from '@/components/shared/tables/BaseDataTable';

interface Props {
  data: Lead[];
  sortConfig: { key: any; direction: 'asc' | 'desc' } | null;
  onSort: (key: any) => void;
  selectedIds: number[];
  onToggleSelect: (id: string | number) => void;
  onToggleSelectAll: () => void;
  onEdit: (lead: Lead) => void;
  onDelete: (id: number) => void;
  onToggleUrgency: (id: number, current: boolean) => void;
  onUpdateStatus: (id: number, status: string) => void;
  stages: any[];
  
  // Pagination
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isLoading?: boolean;
}

export const LeadsTableView: React.FC<Props> = ({
  data,
  sortConfig,
  onSort,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
  onToggleUrgency,
  onUpdateStatus,
  stages,
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  isLoading
}) => {
  const getStatusVariant = (status: string): 'info' | 'success' | 'danger' | 'warning' | 'primary' | 'neutral' | 'sky' | 'indigo' | 'amber' | 'emerald' | 'rose' => {
    switch (status.toLowerCase()) {
      case 'pending': return 'info';
      case 'qualified': return 'success';
      case 'unqualified': return 'danger';
      case 'working': return 'warning';
      default: return 'primary';
    }
  };

  const columns: ColumnConfig<Lead>[] = [
    {
      header: 'ID',
      key: 'id',
      sortable: true,
      className: 'w-20 font-mono text-[11px] text-gray-400 py-5 px-6',
      render: (lead) => (
        <span 
          className="cursor-pointer hover:text-blue-600 transition-colors hover:underline"
          onClick={() => onEdit(lead)}
        >
          #{String(lead.id).padStart(4, '0')}
        </span>
      )
    },
    {
      header: 'Tanggal Input',
      key: 'input_date',
      sortable: true,
      render: (lead) => (
        <div className="flex items-center gap-2 text-gray-400">
          <Clock size={12} strokeWidth={2.5} />
          <Label className="text-[11px]">
            {lead.input_date ? new Date(lead.input_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
          </Label>
        </div>
      )
    },
    {
      header: 'Lead',
      key: 'name',
      sortable: true,
      render: (lead) => (
        <div>
          <div className="flex items-center cursor-pointer transition-colors hover:underline gap-1"  onClick={() => onEdit(lead)}>
            {lead.salutation && <span className="text-blue-500/70 font-medium">{lead.salutation}</span>}
            <span 
              className={` ${lead.is_urgent ? 'font-bold text-gray-900' : 'text-gray-700'}`}
            >
              {lead.name}
            </span>
          </div>
          <Subtext className="text-[10px] !text-gray-400 mt-0.5 uppercase tracking-wider font-medium">
            {lead.client_company?.name || 'Perorangan'}
          </Subtext>
        </div>
      )
    },
    {
      header: 'Nilai (Est)',
      key: 'expected_value',
      sortable: true,
      render: (lead) => (
        <span className="text-gray-600 font-semibold">{formatIDR(lead.expected_value)}</span>
      )
    },
    {
      header: 'PIC',
      key: 'sales_name',
      sortable: true,
      render: (lead) => (
        <div className="flex items-center gap-2">
          <Avatar 
            name={lead.sales_profile?.full_name} 
            src={lead.sales_profile?.avatar_url} 
            size="sm" 
            className="bg-blue-50 text-blue-600 border border-blue-100" 
          />
          <Label className="text-gray-700 font-medium">
            {lead.sales_profile?.full_name?.split(' ')[0] || '-'}
          </Label>
        </div>
      )
    },
    {
      header: 'Status',
      key: 'status',
      sortable: true,
      headerClassName: 'text-center',
      className: 'text-center',
      render: (lead) => (
        <ComboBox
          value={lead.status}
          onChange={(val) => onUpdateStatus(lead.id, val.toString())}
          options={stages.map(s => ({
            value: s.name.toLowerCase(),
            label: s.name.toUpperCase()
          }))}
          className="w-32 mx-auto"
          size="sm"
          variant="badge"
          badgeVariant={getStatusVariant(lead.status)}
          hideSearch
          triggerClassName="border-none shadow-none ml-auto mr-auto"
          placeholderSize="text-[9px] font-bold"
        />
      )
    },
    {
      header: 'Aksi',
      key: 'actions',
      headerClassName: 'text-center',
      className: 'text-center',
      render: (lead) => (
        <div className="flex justify-center">
          <ActionMenu>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleUrgency(lead.id, !!lead.is_urgent); }}
              className={`w-full text-left px-4 py-2.5 text-[11px] font-bold uppercase flex items-center gap-2 transition-none ${
                lead.is_urgent ? 'text-amber-600 bg-amber-50/30' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Zap size={14} className={lead.is_urgent ? 'fill-amber-500' : ''} />
              {lead.is_urgent ? 'Hapus Prioritas' : 'Tandai Prioritas'}
            </button>
            
            <button
              onClick={() => onEdit(lead)}
              className="w-full text-left px-4 py-2.5 text-[11px] font-bold uppercase text-blue-600 hover:bg-blue-50 flex items-center gap-2 transition-none"
            >
              <Eye size={14} />
              Detail Lead
            </button>
            
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(lead.id); }}
              className="w-full text-left px-4 py-2.5 text-[11px] font-bold uppercase text-rose-600 hover:bg-rose-50 border-t border-gray-50 flex items-center gap-2 transition-none"
            >
              <Trash2 size={14} />
              Hapus Lead
            </button>
          </ActionMenu>
        </div>
      )
    }
  ];

  return (
    <BaseDataTable
      data={data}
      columns={columns}
      sortConfig={sortConfig}
      onSort={onSort}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onToggleSelectAll={onToggleSelectAll}
      
      page={page}
      pageSize={pageSize}
      totalCount={totalCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      isLoading={isLoading}
      
      emptyMessage="Tidak ada lead yang ditemukan"
      emptyIcon={<Users size={48} className="mx-auto opacity-10 text-gray-400" />}
      rowClassName={(lead) => lead.is_urgent ? '!border-l-4 !border-l-amber-400 !bg-amber-50/50' : ''}
    />
  );
};
