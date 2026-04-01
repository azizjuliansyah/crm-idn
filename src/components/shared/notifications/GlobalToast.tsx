'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { Toast } from '@/components/ui';

export const GlobalToast: React.FC = () => {
  const { toast, hideToast } = useAppStore();

  return (
    <Toast
      isOpen={toast.isOpen}
      message={toast.message}
      type={toast.type}
      onClose={hideToast}
    />
  );
};
