'use client';

import React from 'react';
import { useDashboard } from '../../../DashboardContext';
import { InvoiceFormView } from '@/components/features/invoices/InvoiceFormView';
import { useRouter } from 'next/navigation';

export default function CreateInvoicePage() {
  const { activeCompany } = useDashboard();
  const router = useRouter();

  if (!activeCompany) return <div className="p-8 text-center text-gray-500">Loading Company Data...</div>;

  return (
    <InvoiceFormView 
      company={activeCompany} 
      onSaveSuccess={() => router.push('/dashboard/sales/invoices')}
    />
  );
}
