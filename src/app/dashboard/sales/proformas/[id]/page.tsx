'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { ProformaFormView } from '@/components/features/proformas/ProformaFormView';
import { useRouter } from 'next/navigation';

export default function EditProformaPage({ params }: { params: Promise<{ id: string }> }) {
  const { activeCompany: company } = useAppStore();
  const router = useRouter();
  const { id: idParam } = React.use(params);
  const id = parseInt(idParam);

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
      onSaveSuccess={() => router.push('/dashboard/sales/proformas?success=updated')}
    />
  );
}
