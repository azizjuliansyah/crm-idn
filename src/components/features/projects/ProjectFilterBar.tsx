import React from 'react';
import { ComboBox } from '@/components/ui';
import { CompanyMember, ClientCompany } from '@/lib/types';

interface ProjectFilterBarProps {
  clientFilter: string;
  setClientFilter: (val: string) => void;
  assigneeFilter: string;
  setAssigneeFilter: (val: string) => void;
  clientCompanies: ClientCompany[];
  members: CompanyMember[];
}

export const ProjectFilterBar: React.FC<ProjectFilterBarProps> = ({
  clientFilter,
  setClientFilter,
  assigneeFilter,
  setAssigneeFilter,
  clientCompanies,
  members
}) => {
  return (
    <div className="flex items-center gap-3 shrink-0">
      <ComboBox
        value={clientFilter}
        onChange={(val: string | number) => setClientFilter(val.toString())}
        options={[
          { value: 'all', label: 'SEMUA CLIENT' },
          ...clientCompanies.map(c => ({ value: c.id.toString(), label: c.name.toUpperCase() }))
        ]}
        className="w-48"
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
