'use client';

import React from 'react';
import { useDashboard } from '../../../DashboardContext';
import { InvoiceFormView } from '@/components/features/invoices/InvoiceFormView';
import { useRouter, useParams } from 'next/navigation';

export default function EditInvoicePage() {
  const { activeCompany } = useDashboard();
  const router = useRouter();
  const params = useParams();
  const id = params.id ? parseInt(Array.isArray(params.id) ? params.id[0] : params.id) : undefined;

  if (!activeCompany) return <div className="p-8 text-center text-gray-500">Loading Company Data...</div>;
  if (!id) return <div className="p-8 text-center text-red-500">Invalid Invoice ID</div>;

  return (
    <InvoiceFormView 
      company={activeCompany}
      editingId={id}
      onSaveSuccess={() => router.push('/dashboard/sales/invoices')}
    />
  );
}
