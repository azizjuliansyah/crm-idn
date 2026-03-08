'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { UrgencyLevelsSettingsView } from '@/components/features/settings/UrgencyLevelsSettingsView';

export default function UrgenciesPage() {
    const { activeCompany: company } = useDashboard();

    if (!company) return null;

    return <UrgencyLevelsSettingsView company={company} />;
}
