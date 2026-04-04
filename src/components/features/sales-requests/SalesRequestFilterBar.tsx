import React from 'react';
import { ComboBox } from '@/components/ui';

interface SalesRequestFilterBarProps {
  filterStatus: string;
  setFilterStatus: (val: string) => void;
}

export const SalesRequestFilterBar: React.FC<SalesRequestFilterBarProps> = ({
  filterStatus,
  setFilterStatus,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-4 shrink-0">

      <div className="flex items-center gap-3 shrink-0 ml-auto">
        <ComboBox
          value={filterStatus}
          onChange={(val: string | number) => setFilterStatus(val.toString())}
          placeholder="Status"
          options={[
            { value: 'all', label: 'SEMUA STATUS' },
            { value: 'Pending', label: 'PENDING' },
            { value: 'Approved', label: 'APPROVED' },
            { value: 'Rejected', label: 'REJECTED' },
          ]}
          className="w-40"
          hideSearch={true}
          placeholderSize="text-[10px] font-bold text-gray-900 uppercase "
        />
      </div>
    </div>
  );
};
