'use client';

import React from 'react';
import { useDashboard } from '../../../DashboardContext';
import { KwitansiFormView } from '@/components/features/kwitansis/KwitansiFormView';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CreateKwitansiPage() {
  const { activeCompany } = useDashboard();
  const router = useRouter();
  const searchParams = useSearchParams();

  const clientId = searchParams.get('clientId');
  const proformaId = searchParams.get('proformaId');
  const quotationId = searchParams.get('quotationId');
  const invoiceId = searchParams.get('invoiceId');
  const requestId = searchParams.get('requestId');

  if (!activeCompany) return <div className="p-8 text-center text-gray-500">Loading Company Data...</div>;

  return (
    <KwitansiFormView
      company={activeCompany}
      initialClientId={clientId ? parseInt(clientId) : undefined}
      initialProformaId={proformaId ? parseInt(proformaId) : undefined}
      initialQuotationId={quotationId ? parseInt(quotationId) : undefined}
      initialInvoiceId={invoiceId ? parseInt(invoiceId) : undefined}
      initialRequestId={requestId ? parseInt(requestId) : undefined}
      onSaveSuccess={() => router.push(requestId ? '/dashboard/sales/kwitansi-requests' : '/dashboard/sales/kwitansis')}
    />
  );
}
