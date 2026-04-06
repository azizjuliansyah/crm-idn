'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { KwitansiRequestsView } from '@/components/features/kwitansis/KwitansiRequestsView';

export default function KwitansiRequestsPage() {
    const { activeCompany: company } = useAppStore();

    if (!company) return null;

    return <KwitansiRequestsView company={company} />;
}
