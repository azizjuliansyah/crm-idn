'use client';

import React from 'react';
import { useDashboard } from '../../../DashboardContext';
import { InvoiceFormView } from '@/components/features/invoices/InvoiceFormView';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CreateInvoicePage() {
  const { activeCompany } = useDashboard();
  const router = useRouter();
  const searchParams = useSearchParams();

  const clientId = searchParams.get('clientId');
  const proformaId = searchParams.get('proformaId');
  const quotationId = searchParams.get('quotationId');
  const requestId = searchParams.get('requestId');

  if (!activeCompany) return <div className="p-8 text-center text-gray-500">Loading Company Data...</div>;

  return (
    <InvoiceFormView
      company={activeCompany}
      initialClientId={clientId ? parseInt(clientId) : undefined}
      initialProformaId={proformaId ? parseInt(proformaId) : undefined}
      initialQuotationId={quotationId ? parseInt(quotationId) : undefined}
      initialRequestId={requestId ? parseInt(requestId) : undefined}
      onSaveSuccess={() => router.push(requestId ? '/dashboard/sales/invoice-requests' : '/dashboard/sales/invoices')}
    />
  );
}
