'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { ProformasView } from '@/components/features/proformas/ProformasView';

export default function ProformasPage() {
  const { activeCompany: company } = useAppStore();

  if (!company) return null;

  return <ProformasView company={company} />;
}
