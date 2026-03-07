'use client';

import React, { Suspense } from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { ProformaFormView } from '@/components/features/proformas/ProformaFormView';
import { useRouter, useSearchParams } from 'next/navigation';

function CreateProformaContent() {
  const { activeCompany: company } = useDashboard();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quotationId = searchParams.get('quotationId');

  if (!company) return null;

  return (
    <ProformaFormView
      company={company}
      initialQuotationId={quotationId ? Number(quotationId) : undefined}
      onNavigate={(path) => {
        if (path === 'daftar_proforma') {
          router.push('/dashboard/sales/proformas');
        }
      }}
      onSaveSuccess={() => router.push('/dashboard/sales/proformas?success=created')}
    />
  );
}

export default function CreateProformaPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateProformaContent />
    </Suspense>
  );
}
