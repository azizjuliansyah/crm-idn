'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { ProformaFormView } from '@/components/ProformaFormView';
import { useRouter } from 'next/navigation';

export default function CreateProformaPage() {
  const { activeCompany: company } = useDashboard();
  const router = useRouter();

  if (!company) return null;

  return (
    <ProformaFormView 
      company={company} 
      onNavigate={(path) => {
        if (path === 'daftar_proforma') {
          router.push('/dashboard/sales/proformas');
        }
      }}
      onSaveSuccess={(id) => {
        router.push('/dashboard/sales/proformas');
      }}
    />
  );
}
