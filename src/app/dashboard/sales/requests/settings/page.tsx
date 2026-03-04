'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { SalesRequestCategoriesSettingsView } from '@/components/features/settings/SalesRequestCategoriesSettingsView';

export default function SalesRequestCategoriesPage() {
    const { activeCompany: company } = useDashboard();

    if (!company) return null;

    return <SalesRequestCategoriesSettingsView company={company} />;
}
