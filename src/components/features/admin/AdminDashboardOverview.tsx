import React from 'react';
import { Building2, Users } from 'lucide-react';
import { Card, Label, H3 } from '@/components/ui';

interface AdminDashboardOverviewProps {
  stats: {
    companiesCount: number;
    usersCount: number;
  };
}

export const AdminDashboardOverview: React.FC<AdminDashboardOverviewProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card contentClassName="p-8">
        <Building2 size={24} className="text-blue-600 mb-6" />
        <Label className="mb-1 block">Total Workspace</Label>
        <H3 className="text-4xl ">{stats.companiesCount}</H3>
      </Card>
      <Card contentClassName="p-8">
        <Users size={24} className="text-emerald-600 mb-6" />
        <Label className="mb-1 block">Total Pengguna</Label>
        <H3 className="text-4xl ">{stats.usersCount}</H3>
      </Card>
    </div>
  );
};
