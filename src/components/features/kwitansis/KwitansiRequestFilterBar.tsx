import React from 'react';
import { ComboBox } from '@/components/ui';

interface KwitansiRequestFilterBarProps {
  filterStatus: string;
  setFilterStatus: (val: string) => void;
}

export const KwitansiRequestFilterBar: React.FC<KwitansiRequestFilterBarProps> = ({
  filterStatus,
  setFilterStatus,
}) => {
  return (
    <div className="flex items-center gap-3 shrink-0">

      <div className="flex items-center gap-3 shrink-0 ml-auto">
        <ComboBox
          value={filterStatus}
          onChange={(val: string | number) => setFilterStatus(val as string)}
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
