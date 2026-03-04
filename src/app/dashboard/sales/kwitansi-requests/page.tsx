'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { KwitansiRequestsView } from '@/components/features/kwitansis/KwitansiRequestsView';

export default function KwitansiRequestsPage() {
    const { activeCompany: company } = useDashboard();

    if (!company) return null;

    return <KwitansiRequestsView company={company} />;
}
