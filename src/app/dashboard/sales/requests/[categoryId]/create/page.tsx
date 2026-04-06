'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { SalesRequestFormView } from '@/components/features/sales-requests/SalesRequestFormView';
import { useParams } from 'next/navigation';

export default function CreateSalesRequestPage() {
    const { activeCompany: company, user } = useAppStore();
    const params = useParams();

    const categoryId = parseInt(params.categoryId as string);

    if (!company || !user || isNaN(categoryId)) return null;

    return <SalesRequestFormView company={company} user={user} categoryId={categoryId} />;
}
