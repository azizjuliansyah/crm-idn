import React from 'react';
import { SearchInput, ComboBox } from '@/components/ui';

interface QuotationFilterBarProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  filterStatus: string;
  setFilterStatus: (val: string) => void;
}

export const QuotationFilterBar: React.FC<QuotationFilterBarProps> = ({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus
}) => {
  return (
    <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-50">
      <div className="w-[400px] shrink-0">
        <SearchInput
          placeholder="Cari nomor, client..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-auto">
        <ComboBox
          value={filterStatus}
          onChange={(val: string | number) => setFilterStatus(val as string)}
          options={[
            { value: 'all', label: 'SEMUA STATUS' },
            ...['Draft', 'Sent', 'Accepted', 'Declined'].map(s => ({ value: s, label: s.toUpperCase() }))
          ]}
          className="w-40"
          hideSearch={true}
          placeholderSize="text-[10px] font-bold text-gray-900 uppercase "
        />
      </div>
    </div>
  );
};
