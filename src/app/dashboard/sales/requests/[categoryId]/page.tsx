'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { SalesRequestsView } from '@/components/features/sales-requests/SalesRequestsView';
import { useParams } from 'next/navigation';

export default function SalesRequestsPage() {
    const { activeCompany: company } = useAppStore();
    const params = useParams();

    const categoryId = parseInt(params.categoryId as string);

    if (!company || isNaN(categoryId)) return null;

    return <SalesRequestsView company={company} categoryId={categoryId} />;
}
