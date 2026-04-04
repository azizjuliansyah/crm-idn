import React from 'react';
import { ComboBox } from '@/components/ui';
import { ClientCompany } from '@/lib/types';

interface ClientFilterBarProps {
  companyFilter: string;
  setCompanyFilter: (val: string) => void;
  clientCompanies: ClientCompany[];
}

export const ClientFilterBar: React.FC<ClientFilterBarProps> = ({
  companyFilter,
  setCompanyFilter,
  clientCompanies
}) => {
  return (
    <div className="flex items-center gap-3 shrink-0">
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
    </div>
  );
};
