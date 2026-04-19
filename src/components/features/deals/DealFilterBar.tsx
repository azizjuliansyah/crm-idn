import React from 'react';
import { DateFilterDropdown, ComboBox } from '@/components/ui';
import { CompanyMember, Pipeline, ClientCompany } from '@/lib/types';

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
  companyFilter: string;
  setCompanyFilter: (val: string) => void;
  probabilityFilter: string;
  setProbabilityFilter: (val: string) => void;
  pipeline: Pipeline | null;
  members: CompanyMember[];
  clientCompanies: ClientCompany[];
}

export const DealFilterBar: React.FC<DealFilterBarProps> = ({
  dateFilterType, setDateFilterType,
  startDateFilter, setStartDateFilter,
  endDateFilter, setEndDateFilter,
  followUpFilter, setFollowUpFilter,
  statusFilter, setStatusFilter,
  assigneeFilter, setAssigneeFilter,
  companyFilter, setCompanyFilter,
  probabilityFilter, setProbabilityFilter,
  pipeline,
  members,
  clientCompanies
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
        value={companyFilter}
        onChange={(val: string | number) => setCompanyFilter(val.toString())}
        options={[
          { value: 'all', label: 'SEMUA PERUSAHAAN' },
          ...clientCompanies.map(c => ({ value: c.id.toString(), label: c.name.toUpperCase() }))
        ]}
        className="w-38"
        placeholderSize="text-[10px] font-bold text-gray-900 uppercase "
      />
      <ComboBox
        value={probabilityFilter}
        onChange={(val: string | number) => setProbabilityFilter(val.toString())}
        options={[
          { value: 'all', label: 'SEMUA PROB.' },
          { value: '0', label: '0 - 25%' },
          { value: '25', label: '25 - 50%' },
          { value: '50', label: '50 - 75%' },
          { value: '75', label: '75 - 99%' },
          { value: '100', label: '100% (WIN)' },
        ]}
        className="w-32"
        hideSearch
        placeholderSize="text-[10px] font-bold text-gray-900 uppercase "
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
        className="w-32"
        hideSearch
        placeholderSize="text-[10px] font-bold text-gray-900 uppercase "
      />
      <ComboBox
        hideSearch
        value={statusFilter}
        onChange={(val: string | number) => setStatusFilter(val.toString())}
        options={[
          { value: 'all', label: 'SEMUA STATUS' },
          ...(pipeline?.stages?.map(s => ({ value: s.id, label: s.name.toUpperCase() })) || [])
        ]}
        className="w-30"
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
        className="w-32"
        placeholderSize="text-[10px] font-bold text-gray-900 uppercase "
      />
    </div>
  );
};
