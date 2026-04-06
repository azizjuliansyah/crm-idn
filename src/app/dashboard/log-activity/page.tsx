'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { LogActivityView } from '@/components/features/log-activity/LogActivityView';

export default function LogActivityPage() {
    const { user, activeCompany } = useAppStore();

    if (!user || !activeCompany) return null;

    return <LogActivityView user={user} companyId={activeCompany.id} />;
}
