'use client';

import { Profile, Project } from '@/lib/types';

import React, { useState } from 'react';

import { Button, H2, Subtext } from '@/components/ui';


import { usePathname, useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store/useAppStore';
import { Layout } from './Layout';
import { Loader2 } from 'lucide-react';
import { getPathFromViewId, getViewIdFromPath } from '@/lib/navigation';
import { PlatformAdminView } from '../features/admin/PlatformAdminView';
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

        // Prioritize Profile View regardless of Admin/Workspace status
        if (activeView === 'profil_saya') {
          return children;
        }

        if (user.platform_role === 'ADMIN' && !activeCompany) {
          return <PlatformAdminView activeView={activeView} onSettingsUpdate={() => { }} onRefresh={() => window.location.reload()} />;
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

        return children;
      })()}
    </Layout>
  );
}

