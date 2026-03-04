'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { SalesRequestsView } from '@/components/features/sales-requests/SalesRequestsView';
import { useParams } from 'next/navigation';

export default function SalesRequestsPage() {
    const { activeCompany: company } = useDashboard();
    const params = useParams();

    const categoryId = parseInt(params.categoryId as string);

    if (!company || isNaN(categoryId)) return null;

    return <SalesRequestsView company={company} categoryId={categoryId} />;
}
