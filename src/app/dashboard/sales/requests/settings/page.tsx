'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { SalesRequestCategoriesSettingsView } from '@/components/features/settings/SalesRequestCategoriesSettingsView';

export default function SalesRequestCategoriesPage() {
    const { activeCompany: company } = useAppStore();

    if (!company) return null;

    return <SalesRequestCategoriesSettingsView company={company} />;
}
