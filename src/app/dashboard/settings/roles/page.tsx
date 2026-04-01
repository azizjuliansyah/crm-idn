'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { RolesManagementView } from '@/components/features/admin/RolesManagementView';
import { supabase } from '@/lib/supabase';
import { CompanyRole } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function RolesPage() {
  const { activeCompany, showToast } = useAppStore();
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (isInitial = false) => {
    if (!activeCompany) return;
    if (isInitial) setLoading(true);
    try {
      const { data, error } = await supabase.from('company_roles').select('*').eq('company_id', activeCompany.id);
      if (error) throw error;
      if (data) setRoles(data);
    } catch (error: any) {
      showToast("Error fetching roles: " + error.message, 'error');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [activeCompany, showToast]);

  useEffect(() => {
    if (activeCompany) {
      fetchData(true);
    }
  }, [activeCompany, fetchData]);

  if (!activeCompany) return <div className="p-8 text-center text-gray-500">Pilih workspace terlebih dahulu.</div>;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-24">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return <RolesManagementView company={activeCompany} roles={roles} onUpdate={() => fetchData(false)} />;
}
