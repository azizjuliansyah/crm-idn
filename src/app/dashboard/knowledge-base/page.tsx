'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { KnowledgeBaseView } from '@/components/features/knowledge-base/KnowledgeBaseView';

export default function KnowledgeBasePage() {
  const { activeCompany: company } = useAppStore();

  if (!company) return null;

  return <KnowledgeBaseView activeCompany={company} />;
}
