'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { UrgencyLevelsSettingsView } from '@/components/features/settings/UrgencyLevelsSettingsView';

export default function UrgenciesPage() {
    const { activeCompany: company } = useAppStore();

    if (!company) return null;

    return <UrgencyLevelsSettingsView company={company} />;
}
