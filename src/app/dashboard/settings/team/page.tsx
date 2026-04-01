'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { TeamMembersView } from '@/components/features/admin/TeamMembersView';
import { supabase } from '@/lib/supabase';
import { CompanyMember, CompanyRole } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function TeamPage() {
    const { activeCompany, user, showToast } = useAppStore();
    const [members, setMembers] = useState<CompanyMember[]>([]);
    const [roles, setRoles] = useState<CompanyRole[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async (isInitial = false) => {
        if (!activeCompany) return;
        if (isInitial) setLoading(true);
        try {
            const [memsRes, rolesRes] = await Promise.all([
                supabase.from('company_members').select('*, profile:profiles(*), company_roles(*)').eq('company_id', activeCompany.id),
                supabase.from('company_roles').select('*').eq('company_id', activeCompany.id)
            ]);
            if (memsRes.error) throw memsRes.error;
            if (rolesRes.error) throw rolesRes.error;

            if (memsRes.data) setMembers(memsRes.data);
            if (rolesRes.data) setRoles(rolesRes.data);
        } catch (error: any) {
            showToast("Error fetching team data: " + error.message, 'error');
        } finally {
            if (isInitial) setLoading(false);
        }
    }, [activeCompany, showToast]);

    useEffect(() => {
        if (activeCompany) {
            fetchData(true);
        }
    }, [activeCompany, fetchData]);

    if (!user) return null;
    if (!activeCompany) return <div className="p-8 text-center text-gray-500">Pilih workspace terlebih dahulu.</div>;

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center py-24">
                <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    return <TeamMembersView company={activeCompany} members={members} roles={roles} user={user} onUpdate={() => fetchData(false)} />;
}
