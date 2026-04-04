import React from 'react';
import { ComboBox } from '@/components/ui';
import { CompanyMember, TaskStage } from '@/lib/types';

interface TaskFilterBarProps {
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  assigneeFilter: string;
  setAssigneeFilter: (val: string) => void;
  stages: TaskStage[];
  members: CompanyMember[];
}

export const TaskFilterBar: React.FC<TaskFilterBarProps> = ({
  statusFilter,
  setStatusFilter,
  assigneeFilter,
  setAssigneeFilter,
  stages,
  members
}) => {
  return (
    <div className="flex items-center gap-3 shrink-0">
      <ComboBox
        value={statusFilter}
        onChange={(val: string | number) => setStatusFilter(val.toString())}
        options={[
          { value: 'all', label: 'SEMUA STATUS' },
          ...stages.map(s => ({ value: s.id, label: s.name.toUpperCase() }))
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
