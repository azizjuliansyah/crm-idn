'use client';

import React from 'react';
import { useDashboard } from '../../../DashboardContext';
import { QuotationFormView } from '@/components/QuotationFormView';
import { useRouter } from 'next/navigation';

export default function CreateQuotationPage() {
  const { activeCompany } = useDashboard();
  const router = useRouter();

  if (!activeCompany) return <div className="p-8 text-center text-gray-500">Loading Company Data...</div>;

  return (
    <QuotationFormView 
      company={activeCompany} 
      onSaveSuccess={() => router.push('/dashboard/sales/quotations')}
    />
  );
}
