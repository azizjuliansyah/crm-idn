'use client';

import { Profile, Project } from '@/lib/types';

import React, { useState } from 'react';

import { Button, H2, Subtext } from '@/components/ui';


import { usePathname, useRouter } from 'next/navigation';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { Layout } from './Layout';
import { Loader2 } from 'lucide-react';
import { getPathFromViewId } from '@/lib/navigation';
import { PlatformAdminView } from '../features/admin/PlatformAdminView';
import { CompanyWizard } from '../features/settings/CompanyWizard';


export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const { user, companies, activeCompany, setActiveCompany, platformSettings, logout, loading, isLoggingOut } = useDashboard();
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

  // Determine active view from pathname for Sidebar highlighting
  const getActiveView = () => {
    if (pathname === '/dashboard') return 'dashboard';
    if (pathname === '/dashboard/admin/companies') return 'perusahaan';
    if (pathname === '/dashboard/admin/users') return 'pengguna';
    if (pathname === '/dashboard/admin/platform') return 'pengaturan';
    if (pathname === '/dashboard/admin/email') return 'pengaturan_email';

    // Leads
    if (pathname === '/dashboard/leads') return 'leads';
    if (pathname.startsWith('/dashboard/leads/settings')) return 'pengaturan_leads';
    if (pathname.startsWith('/dashboard/leads/sources')) return 'pengaturan_sumber_leads';

    // Log Activity
    if (pathname === '/dashboard/log-activity') return 'log_activity';

    // Deals
    if (pathname === '/dashboard/deals') return 'deals';
    if (pathname.startsWith('/dashboard/deals/pipelines')) return 'pengaturan_deals_pipeline';
    if (pathname.startsWith('/dashboard/deals/')) {
      // Check if it is a specific pipeline view like /dashboard/deals/1
      const parts = pathname.split('/');
      const id = parts[3];
      if (!isNaN(parseInt(id))) return `deals_${id}`;
    }

    // Projects
    if (pathname === '/dashboard/projects') return 'projects';
    if (pathname.startsWith('/dashboard/projects/')) {
      const parts = pathname.split('/');
      const id = parts[3];
      if (!isNaN(parseInt(id))) return `projects_${id}`;
    }

    // Support
    if (pathname.startsWith('/dashboard/support/pipelines')) return 'support_pipeline';
    if (pathname.startsWith('/dashboard/support')) return 'customer_support'; // Default support
    if (pathname.startsWith('/dashboard/complaints')) return 'complaints';
    if (pathname.startsWith('/dashboard/knowledge-base')) return 'knowledge_base';
    if (pathname === '/dashboard/ai') return 'ai_assistant';

    // Products
    if (pathname === '/dashboard/products' || pathname.startsWith('/dashboard/products/list')) return 'daftar_produk';
    if (pathname.startsWith('/dashboard/products/categories')) return 'kategori_produk';
    if (pathname.startsWith('/dashboard/products/units')) return 'satuan_produk';

    // SOPs
    if (pathname === '/dashboard/sops') return 'sop_all';
    if (pathname.startsWith('/dashboard/sops/categories')) return 'sop_category_settings';
    if (pathname.startsWith('/dashboard/sops/archive')) return 'sop_archive';
    if (pathname.startsWith('/dashboard/sops/category/')) {
      const parts = pathname.split('/');
      const id = parts[4];
      return `sop_cat_${id}`;
    }
    if (pathname.startsWith('/dashboard/sops/')) {
      // Could be detail or edit
      if (pathname.includes('/edit')) return 'sop_editor';
      return 'sop_detail';
    }

    // Clients
    if (pathname.startsWith('/dashboard/clients/companies')) return 'perusahaan_client';
    if (pathname.startsWith('/dashboard/clients/contacts')) return 'data_client';
    if (pathname.startsWith('/dashboard/clients/categories')) return 'pengaturan_kategori_client';

    // Sales
    if (pathname.startsWith('/dashboard/sales/quotations')) {
      if (pathname.includes('/create')) return 'buat_penawaran';
      const parts = pathname.split('/');
      if (parts.length > 4 && !isNaN(parseInt(parts[4]))) return 'edit_penawaran';
      return 'daftar_penawaran';
    }
    if (pathname.startsWith('/dashboard/sales/proformas')) {
      if (pathname.includes('/create')) return 'buat_proforma';
      const parts = pathname.split('/');
      if (parts.length > 4 && !isNaN(parseInt(parts[4]))) return 'edit_proforma';
      return 'daftar_proforma';
    }
    if (pathname.startsWith('/dashboard/sales/invoices')) {
      if (pathname.includes('/create')) return 'buat_invoice';
      const parts = pathname.split('/');
      if (parts.length > 4 && !isNaN(parseInt(parts[4]))) return 'edit_invoice';
      return 'daftar_invoice';
    }
    if (pathname.startsWith('/dashboard/sales/kwitansis')) {
      if (pathname.includes('/create')) return 'buat_kwitansi';
      const parts = pathname.split('/');
      if (parts.length > 4 && !isNaN(parseInt(parts[4]))) return 'edit_kwitansi';
      return 'daftar_kwitansi';
    }
    if (pathname.startsWith('/dashboard/sales/invoice-requests')) {
      if (pathname.includes('/create')) return 'buat_request_invoice';
      const parts = pathname.split('/');
      if (parts.length > 4 && !isNaN(parseInt(parts[4]))) return 'edit_request_invoice';
      return 'request_invoice';
    }
    if (pathname.startsWith('/dashboard/sales/kwitansi-requests')) {
      if (pathname.includes('/create')) return 'buat_request_kwitansi';
      const parts = pathname.split('/');
      if (parts.length > 4 && !isNaN(parseInt(parts[4]))) return 'edit_request_kwitansi';
      return 'request_kwitansi';
    }
    if (pathname.startsWith('/dashboard/sales/requests/settings')) return 'request_category_settings';
    if (pathname.startsWith('/dashboard/sales/requests')) {
      const parts = pathname.split('/');
      if (parts.length > 4) {
        const catId = parts[4];
        if (pathname.includes('/create')) return `buat_request_cat_${catId}`;
        if (parts.length > 5 && !isNaN(parseInt(parts[5]))) return `edit_request_cat_${catId}`;
        return `request_cat_${catId}`;
      }
    }

    // Sales Settings
    if (pathname.startsWith('/dashboard/sales/settings/autonumber')) return 'penomoran_otomatis';
    if (pathname.startsWith('/dashboard/sales/settings/tax')) return 'pengaturan_pajak';
    if (pathname.startsWith('/dashboard/sales/settings/templates')) return 'pengaturan_template_pdf';

    // General Settings
    if (pathname.startsWith('/dashboard/settings/company')) return 'pengaturan_perusahaan';
    if (pathname.startsWith('/dashboard/settings/email')) return 'workspace_email_config';
    if (pathname.startsWith('/dashboard/settings/team')) return 'anggota_tim';
    if (pathname.startsWith('/dashboard/settings/roles')) return 'manajemen_role';
    if (pathname.startsWith('/dashboard/settings/profile')) return 'profil_saya';
    if (pathname.startsWith('/dashboard/settings/ticket-topic')) return 'pengaturan_ticket_topic';
    if (pathname.startsWith('/dashboard/settings/ai')) return 'pengaturan_ai';
    if (pathname.startsWith('/dashboard/settings/urgencies')) return 'pengaturan_urgensi_request';

    // Project Settings
    if (pathname.startsWith('/dashboard/settings/projects/pipelines')) return 'pengaturan_project_pipeline';
    if (pathname.startsWith('/dashboard/settings/projects/task-stages')) return 'pengaturan_task_pipeline';

    // Fallback logic
    const parts = pathname.split('/');
    if (parts.length > 2) return parts[2];
    return 'dashboard';
  };

  const handleNavigate = (viewId: string) => {
    const path = getPathFromViewId(viewId);
    router.push(path);
  };

  // State for wizard if needed, but we can also just use the fact that !activeCompany
  const [showWizard, setShowWizard] = React.useState(false);

  return (
    <Layout
      user={user}
      companies={companies}
      activeCompany={activeCompany}
      onCompanyChange={setActiveCompany}
      platformSettings={platformSettings}
      onLogout={logout}
      activeView={getActiveView()}
      onNavigate={handleNavigate}
    >
      {/* Logic from DashboardApp.tsx moved here */}
      {(() => {
        const activeView = getActiveView();

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

