'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { ProductUnitsView } from '@/components/features/products/ProductUnitsView';

export default function ProductUnitsPage() {
  const { activeCompany } = useAppStore();
  return <ProductUnitsView company={activeCompany} />;
}
