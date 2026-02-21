'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { ProformaFormView } from '@/components/ProformaFormView';
import { useRouter } from 'next/navigation';

export default function EditProformaPage({ params }: { params: { id: string } }) {
  const { activeCompany: company } = useDashboard();
  const router = useRouter();
  const id = parseInt(params.id);

  if (!company) return null;

  return (
    <ProformaFormView 
      company={company} 
      editingId={id}
      onNavigate={(path) => {
        if (path === 'daftar_proforma') {
          router.push('/dashboard/sales/proformas');
        }
      }}
      onSaveSuccess={(id) => {
        // Stay on page after update, or maybe navigate back?
        // Usually stay on page is better for updates
      }}
    />
  );
}
