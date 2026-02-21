'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '../../DashboardContext';
import { TeamMembersView } from '@/components/TeamMembersView';
import { supabase } from '@/lib/supabase';
import { CompanyMember, CompanyRole } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function TeamPage() {
  const { activeCompany, user } = useDashboard();
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!activeCompany) return;
    setLoading(true);
    try {
        const [memsRes, rolesRes] = await Promise.all([
            supabase.from('company_members').select('*, profile:profiles(*), company_roles(*)').eq('company_id', activeCompany.id),
            supabase.from('company_roles').select('*').eq('company_id', activeCompany.id)
        ]);
        if (memsRes.data) setMembers(memsRes.data);
        if (rolesRes.data) setRoles(rolesRes.data);
    } catch (error) {
        console.error("Error fetching team data", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeCompany]);

  if (!user) return null;
  if (!activeCompany) return <div className="p-8 text-center text-gray-500">Pilih workspace terlebih dahulu.</div>;

  if (loading) {
      return (
          <div className="flex h-full items-center justify-center">
              <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
      );
  }

  return <TeamMembersView company={activeCompany} members={members} roles={roles} user={user} onUpdate={fetchData} />;
}
