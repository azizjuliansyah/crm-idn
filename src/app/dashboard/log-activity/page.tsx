'use client';

import React from 'react';
import { useDashboard } from '../DashboardContext';
import { LogActivityView } from '@/components/features/log-activity/LogActivityView';

export default function LogActivityPage() {
    const { user, activeCompany } = useDashboard();

    if (!user || !activeCompany) return null;

    return <LogActivityView user={user} companyId={activeCompany.id} />;
}
