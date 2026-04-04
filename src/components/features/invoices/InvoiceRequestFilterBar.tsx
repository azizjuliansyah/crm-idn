import React from 'react';
import { ComboBox, Label } from '@/components/ui';

interface InvoiceRequestFilterBarProps {
  filterStatus: string;
  setFilterStatus: (val: string) => void;
}

export const InvoiceRequestFilterBar: React.FC<InvoiceRequestFilterBarProps> = ({
  filterStatus,
  setFilterStatus,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-4 shrink-0">

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
