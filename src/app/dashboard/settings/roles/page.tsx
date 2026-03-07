'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '../../DashboardContext';
import { RolesManagementView } from '@/components/features/admin/RolesManagementView';
import { supabase } from '@/lib/supabase';
import { CompanyRole } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function RolesPage() {
  const { activeCompany } = useDashboard();
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async (isInitial = false) => {
    if (!activeCompany) return;
    if (isInitial) setLoading(true);
    try {
      const { data } = await supabase.from('company_roles').select('*').eq('company_id', activeCompany.id);
      if (data) setRoles(data);
    } catch (error) {
      console.error("Error fetching roles", error);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, [activeCompany]);

  if (!activeCompany) return <div className="p-8 text-center text-gray-500">Pilih workspace terlebih dahulu.</div>;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return <RolesManagementView company={activeCompany} roles={roles} onUpdate={fetchData} />;
}
