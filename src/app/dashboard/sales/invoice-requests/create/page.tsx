'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { InvoiceRequestFormView } from '@/components/InvoiceRequestFormView';
import { useRouter } from 'next/navigation';

export default function CreateInvoiceRequestsPage() {
  const { activeCompany: company, user } = useDashboard();
  const router = useRouter();

  if (!company || !user) return null;

  return (
    <InvoiceRequestFormView 
      company={company} 
      user={user}
      onNavigate={(path) => {
        if (path === 'request_invoice') {
          router.push('/dashboard/sales/invoice-requests');
        }
      }}
    />
  );
}
