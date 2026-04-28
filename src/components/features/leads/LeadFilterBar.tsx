import React from 'react';
import { DateFilterDropdown, ComboBox } from '@/components/ui';
import { CompanyMember, LeadStage, ClientCompany } from '@/lib/types';

interface LeadFilterBarProps {
  dateFilterType: string;
  setDateFilterType: (val: string) => void;
  startDateFilter: string;
  setStartDateFilter: (val: string) => void;
  endDateFilter: string;
  setEndDateFilter: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  assigneeFilter: string;
  setAssigneeFilter: (val: string) => void;
  companyFilter: string;
  setCompanyFilter: (val: string) => void;
  stages: LeadStage[];
  members: CompanyMember[];
  clientCompanies: ClientCompany[];
}

export const LeadFilterBar: React.FC<LeadFilterBarProps> = ({
  dateFilterType, setDateFilterType,
  startDateFilter, setStartDateFilter,
  endDateFilter, setEndDateFilter,
  statusFilter, setStatusFilter,
  assigneeFilter, setAssigneeFilter,
  companyFilter, setCompanyFilter,
  stages,
  members,
  clientCompanies
}) => {
  return (
    <div className="flex items-center gap-3 shrink-0">
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
        className="w-48"
        placeholderSize="text-[10px] font-bold text-gray-900 uppercase "
      />
      <ComboBox
        value={statusFilter}
        onChange={(val: string | number) => setStatusFilter(val.toString())}
        options={[
          { value: 'all', label: 'SEMUA STATUS' },
          ...stages.map(s => ({ value: s.name, label: s.name.toUpperCase() }))
        ]}
        className="w-40"
        hideSearch
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
