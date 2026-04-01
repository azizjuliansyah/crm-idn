import React from 'react';
import { DateFilterDropdown, ComboBox } from '@/components/ui';
import { CompanyMember, Pipeline } from '@/lib/types';

interface DealFilterBarProps {
  dateFilterType: string;
  setDateFilterType: (val: string) => void;
  startDateFilter: string;
  setStartDateFilter: (val: string) => void;
  endDateFilter: string;
  setEndDateFilter: (val: string) => void;
  followUpFilter: string;
  setFollowUpFilter: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  assigneeFilter: string;
  setAssigneeFilter: (val: string) => void;
  pipeline: Pipeline | null;
  members: CompanyMember[];
}

export const DealFilterBar: React.FC<DealFilterBarProps> = ({
  dateFilterType, setDateFilterType,
  startDateFilter, setStartDateFilter,
  endDateFilter, setEndDateFilter,
  followUpFilter, setFollowUpFilter,
  statusFilter, setStatusFilter,
  assigneeFilter, setAssigneeFilter,
  pipeline,
  members
}) => {
  return (
    <div className="flex gap-3 shrink-0 items-center">
      <DateFilterDropdown
        value={dateFilterType}
        onChange={setDateFilterType}
        startDate={startDateFilter}
        endDate={endDateFilter}
        onStartDateChange={setStartDateFilter}
        onEndDateChange={setEndDateFilter}
      />
      <ComboBox
        value={followUpFilter}
        onChange={(val: string | number) => setFollowUpFilter(val.toString())}
        options={[
          { value: 'all', label: 'SEMUA FOLLOW UP' },
          ...[1, 2, 3, 4, 5].map(fu => ({
            value: fu.toString(),
            label: `FU ${fu} KALI`
          }))
        ]}
        className="w-40"
        hideSearch
        placeholderSize="text-[10px] font-bold text-gray-900 uppercase "
      />
      <ComboBox
        value={statusFilter}
        onChange={(val: string | number) => setStatusFilter(val.toString())}
        options={[
          { value: 'all', label: 'SEMUA STATUS' },
          ...(pipeline?.stages?.map(s => ({ value: s.id, label: s.name.toUpperCase() })) || [])
        ]}
        className="w-40"
        placeholderSize="text-[10px] font-bold text-gray-900 uppercase "
      />
      <ComboBox
        value={assigneeFilter}
        onChange={(val: string | number) => setAssigneeFilter(val.toString())}
        options={[
          { value: 'all', label: 'SEMUA STAFF' },
          ...members.map(m => ({
            value: m.user_id,
            label: (m.profile?.full_name || m.user_id).toUpperCase()
          }))
        ]}
        className="w-40"
        placeholderSize="text-[10px] font-bold text-gray-900 uppercase "
      />
    </div>
  );
};
