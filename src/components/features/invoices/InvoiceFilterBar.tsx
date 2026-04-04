import React from 'react';
import { ComboBox } from '@/components/ui';

interface InvoiceFilterBarProps {
  filterStatus: string;
  setFilterStatus: (val: string) => void;
  filterClientId: string;
  setFilterClientId: (val: string) => void;
  clients: any[];
}

export const InvoiceFilterBar: React.FC<InvoiceFilterBarProps> = ({
  filterStatus,
  setFilterStatus,
  filterClientId,
  setFilterClientId,
  clients
}) => {
  return (
    <div className="flex flex-wrap items-center gap-4 shrink-0">

      <div className="flex items-center gap-3 shrink-0 ml-auto">
        <ComboBox
          value={filterClientId}
          onChange={(val: string | number) => setFilterClientId(val as string)}
          options={[
            { value: 'all', label: 'SEMUA CLIENT' },
            ...clients.map(c => ({ value: c.id.toString(), label: c.name.toUpperCase() }))
          ]}
          className="w-48"
          placeholderSize="text-[10px] font-bold text-gray-900 uppercase "
        />
        <ComboBox
          value={filterStatus}
          onChange={(val: string | number) => setFilterStatus(val as string)}
          options={[
            { value: 'all', label: 'SEMUA STATUS' },
            { value: 'Unpaid', label: 'UNPAID' },
            { value: 'Partial', label: 'PARTIAL' },
            { value: 'Paid', label: 'PAID' },
          ]}
          className="w-40"
          hideSearch={true}
          placeholderSize="text-[10px] font-bold text-gray-900 uppercase "
        />
      </div>
    </div>
  );
};
