'use client';
import React, { Suspense } from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { QuotationFormView } from '@/components/features/quotations/QuotationFormView';
import { useRouter, useSearchParams } from 'next/navigation';

function QuotationFormWrapper() {
  const { activeCompany } = useAppStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const clientId = searchParams.get('client_id');
  const dealId = searchParams.get('deal_id');

  if (!activeCompany) return <div className="p-8 text-center text-gray-500">Loading Company Data...</div>;

  return (
    <QuotationFormView
      company={activeCompany}
      initialClientId={clientId ? Number(clientId) : undefined}
      initialDealId={dealId ? Number(dealId) : undefined}
      onSaveSuccess={(id) => router.push(`/dashboard/sales/quotations/${id}`)}
    />
  );
}

export default function CreateQuotationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Memuat form penawaran...</div>}>
      <QuotationFormWrapper />
    </Suspense>
  );
}
