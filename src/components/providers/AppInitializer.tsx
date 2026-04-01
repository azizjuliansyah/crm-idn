'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store/useAppStore';

export function AppInitializer({ children }: { children: React.ReactNode }) {
  const init = useAppStore((state) => state.init);

  useEffect(() => {
    init();
  }, [init]);

  return <>{children}</>;
}
