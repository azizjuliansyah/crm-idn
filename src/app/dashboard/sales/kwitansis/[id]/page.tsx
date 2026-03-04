'use client';

import React from 'react';
import { useDashboard } from '../../../DashboardContext';
import { KwitansiFormView } from '@/components/features/kwitansis/KwitansiFormView';
import { useRouter, useSearchParams } from 'next/navigation';

export default function EditKwitansiPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);
    const { activeCompany } = useDashboard();
    const router = useRouter();
    const searchParams = useSearchParams();
    const convertFromDeal = searchParams.get('convertFromDeal');

    if (!activeCompany) {
        return null;
    }

    return (
        <div className="max-w-7xl mx-auto pb-24">
            <KwitansiFormView
                company={activeCompany}
                onBack={() => {
                    if (convertFromDeal) {
                        router.push(`/dashboard/deals/${convertFromDeal}`);
                    } else {
                        router.push('/dashboard/sales/kwitansis');
                    }
                }}
                kwitansiId={id}
            />
        </div>
    );
}
