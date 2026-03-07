'use client';

import React from 'react';
import { useDashboard } from '../../../DashboardContext';
import { QuotationFormView } from '@/components/features/quotations/QuotationFormView';
import { useRouter, useParams } from 'next/navigation';

export default function EditQuotationPage() {
  const { activeCompany } = useDashboard();
  const router = useRouter();
  const params = useParams();
  const id = params.id ? parseInt(Array.isArray(params.id) ? params.id[0] : params.id) : undefined;

  if (!activeCompany) return <div className="p-8 text-center text-gray-500">Loading Company Data...</div>;
  if (!id) return <div className="p-8 text-center text-red-500">Invalid Quotation ID</div>;

  return (
    <QuotationFormView
      company={activeCompany}
      editingId={id}
      onSaveSuccess={() => router.push('/dashboard/sales/quotations?success=updated')}
    />
  );
}
