'use client';

import React, { Suspense } from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { KwitansiRequestFormView } from '@/components/features/kwitansis/KwitansiRequestFormView';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function CreateKwitansiRequestsPage() {
    const { activeCompany: company, user } = useAppStore();
    const router = useRouter();

    if (!company || !user) return null;

    return (
        <Suspense fallback={<div className="flex justify-center p-24"><Loader2 className="animate-spin text-indigo-600" /></div>}>
            <KwitansiRequestFormView
                company={company}
                user={user}
                onNavigate={(path) => {
                    if (path.startsWith('request_kwitansi')) {
                        router.push('/dashboard/sales/kwitansi-requests');
                    }
                }}
            />
        </Suspense>
    );
}
