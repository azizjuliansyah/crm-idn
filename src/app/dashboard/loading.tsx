'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full gap-4">
      <div className="relative">
        <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl animate-pulse opacity-50" />
        <Loader2 className="animate-spin text-blue-600 relative z-10" size={40} />
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="text-gray-900 font-semibold text-sm">Menyiapkan Halaman...</p>
        <p className="text-gray-400 text-[10px] uppercase tracking-widest font-medium">Mohon Tunggu Sebentar</p>
      </div>
    </div>
  );
}
