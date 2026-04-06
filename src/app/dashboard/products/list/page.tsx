'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { ProductsView } from '@/components/features/products/ProductsView';

export default function ProductsPage() {
  const { activeCompany } = useAppStore();
  if (!activeCompany) return null;
  return <ProductsView company={activeCompany} />;
}
