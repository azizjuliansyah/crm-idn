'use client';

import { Profile, Project } from '@/lib/types';

import React, { useState, useEffect } from 'react';

import { Button, H2, Subtext } from '@/components/ui';


import { usePathname, useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store/useAppStore';
import { Layout } from './Layout';
import { Loader2 } from 'lucide-react';
import { getPathFromViewId, getViewIdFromPath } from '@/lib/navigation';
import { CompanyWizard } from '../features/settings/CompanyWizard';

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const { 
    user, 
    companies, 
    activeCompany, 
    switchCompany: setActiveCompany, 
    platformSettings, 
    logout, 
    loading, 
    isLoggingOut 
  } = useAppStore();
  const [showWizard, setShowWizard] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Redirect Admin to Admin Dashboard if they land on general dashboard without a company
  useEffect(() => {
    if (user?.platform_role === 'ADMIN' && !activeCompany && pathname === '/dashboard') {
      router.replace('/dashboard/admin');
    }
  }, [user, activeCompany, pathname, router]);

  if (loading || isLoggingOut) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (!user) return null;

  const activeView = getViewIdFromPath(pathname);

  const handleNavigate = (viewId: string) => {
    const path = getPathFromViewId(viewId);
    router.push(path);
  };

  return (
    <Layout>
      {/* Logic from DashboardApp.tsx moved here */}
      {(() => {
        // 1. Check User Suspension
        if (user.is_suspended) {
          return (
            <div className="flex h-screen items-center justify-center bg-gray-50 p-4 text-center">
              <div className="max-w-md space-y-4">
                <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <H2 className="text-2xl text-gray-900">Akun Ditangguhkan</H2>
                <Subtext className="text-gray-600">Maaf, akun Anda telah ditangguhkan oleh administrator. Silakan hubungi dukungan untuk informasi lebih lanjut.</Subtext>
                <Button onClick={() => logout()} variant="ghost" className="mt-4">
                  Keluar dari Akun
                </Button>
              </div>
            </div>
          );
        }

        // Prioritize Profile View regardless of Admin/Workspace status
        if (activeView === 'profil_saya') {
          return children;
        }

        if (user.platform_role === 'ADMIN' && !activeCompany) {
          return children;
        }

        if (user.platform_role === 'USER' && (companies?.length || 0) === 0) {
          return <CompanyWizard userId={user.id} onSuccess={() => window.location.reload()} />;
        }

        if (!activeCompany) {
          return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
              <div className="text-center space-y-6">
                <div>
                  <H2 className="text-xl  text-gray-900">Selamat Datang, {user.full_name}</H2>
                  <Subtext className="text-gray-500 mt-2">Silakan pilih workspace untuk memulai.</Subtext>
                </div>
                <Button
                  onClick={() => setShowWizard(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl  shadow-lg hover:bg-blue-700 transition-all"
                >
                  Buat Workspace Baru
                </Button>
                {showWizard && (
                  <CompanyWizard userId={user.id} onSuccess={() => window.location.reload()} />
                )}
              </div>
            </div>
          );
        }

        // 2. Check Workspace Suspension (only for non-admin dashboard paths or non-admin users)
        if (activeCompany.is_suspended && user.platform_role !== 'ADMIN') {
          return (
            <div className="flex h-screen items-center justify-center bg-gray-50 p-4 text-center">
              <div className="max-w-md space-y-4">
                <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <H2 className="text-2xl text-gray-900">Workspace Ditangguhkan</H2>
                <Subtext className="text-gray-600">Workspace "{activeCompany.name}" saat ini sedang ditangguhkan. Silakan pilih workspace lain atau hubungi administrator.</Subtext>
                <div className="flex gap-4 justify-center mt-4">
                  <Button onClick={() => setActiveCompany(null)} variant="primary">
                    Pilih Workspace Lain
                  </Button>
                  <Button onClick={() => logout()} variant="ghost">
                    Keluar
                  </Button>
                </div>
              </div>
            </div>
          );
        }

        return children;
      })()}
    </Layout>
  );
}

