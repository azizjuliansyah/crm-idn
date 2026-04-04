import React from 'react';
import { ComboBox } from '@/components/ui';

interface SupportTicketFilterBarProps {
  filterStatus: string;
  setFilterStatus: (val: string) => void;
  filterClientId: string;
  setFilterClientId: (val: string) => void;
  filterTopicId: string;
  setFilterTopicId: (val: string) => void;
  clients: any[];
  topics: any[];
}

export const SupportTicketFilterBar: React.FC<SupportTicketFilterBarProps> = ({
  filterStatus,
  setFilterStatus,
  filterClientId,
  setFilterClientId,
  filterTopicId,
  setFilterTopicId,
  clients,
  topics
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
          value={filterTopicId}
          onChange={(val: string | number) => setFilterTopicId(val as string)}
          options={[
            { value: 'all', label: 'SEMUA TOPIK' },
            ...topics.map(t => ({ value: t.id.toString(), label: t.name.toUpperCase() }))
          ]}
          className="w-48"
          placeholderSize="text-[10px] font-bold text-gray-900 uppercase "
        />
        <ComboBox
          value={filterStatus}
          onChange={(val: string | number) => setFilterStatus(val as string)}
          options={[
            { value: 'all', label: 'SEMUA STATUS' },
            { value: 'Open', label: 'OPEN' },
            { value: 'In Progress', label: 'IN PROGRESS' },
            { value: 'Resolved', label: 'RESOLVED' },
            { value: 'Closed', label: 'CLOSED' },
          ]}
          className="w-40"
          hideSearch={true}
          placeholderSize="text-[10px] font-bold text-gray-900 uppercase "
        />
      </div>
    </div>
  );
};
