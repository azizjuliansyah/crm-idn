'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { Layout } from './Layout';
import { Loader2 } from 'lucide-react';
import { PlatformAdminView } from './PlatformAdminView';
import { CompanyWizard } from './CompanyWizard';

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const { user, companies, activeCompany, setActiveCompany, platformSettings, logout, loading } = useDashboard();
  const router = useRouter();
  const pathname = usePathname();

  if (loading) {
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
    
    // Leads
    if (pathname === '/dashboard/leads') return 'leads';
    if (pathname.startsWith('/dashboard/leads/settings')) return 'pengaturan_leads';
    if (pathname.startsWith('/dashboard/leads/sources')) return 'pengaturan_sumber_leads';
    
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
        return 'daftar_penawaran';
    }
    if (pathname.startsWith('/dashboard/sales/proformas')) {
        if (pathname.includes('/create')) return 'buat_proforma';
        return 'daftar_proforma';
    }
    if (pathname.startsWith('/dashboard/sales/invoices')) {
        if (pathname.includes('/create')) return 'buat_invoice';
        return 'daftar_invoice';
    }
    if (pathname.startsWith('/dashboard/sales/invoice-requests')) {
        if (pathname.includes('/create')) return 'buat_request_invoice';
        return 'request_invoice';
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
    if (pathname.startsWith('/dashboard/settings/ai')) return 'pengaturan_ai';
    
    // Project Settings
    if (pathname.startsWith('/dashboard/settings/projects/pipelines')) return 'pengaturan_project_pipeline';
    if (pathname.startsWith('/dashboard/settings/projects/task-stages')) return 'pengaturan_task_pipeline';

    // Fallback logic
    const parts = pathname.split('/');
    if (parts.length > 2) return parts[2]; 
    return 'dashboard';
  };

  const handleNavigate = (viewId: string) => {
    switch (viewId) {
      case 'dashboard': router.push('/dashboard'); break;
      
      // CRM
      case 'leads': router.push('/dashboard/leads'); break;
      case 'pengaturan_leads': router.push('/dashboard/leads/settings'); break;
      case 'pengaturan_sumber_leads': router.push('/dashboard/leads/sources'); break;
      case 'deals': router.push('/dashboard/deals'); break;
      case 'pengaturan_deals_pipeline': router.push('/dashboard/deals/pipelines'); break;
      
      // Support
      case 'customer_support': router.push('/dashboard/support'); break;
      case 'support_pipeline': router.push('/dashboard/support/pipelines'); break;
      case 'complaints': router.push('/dashboard/complaints'); break;
      case 'knowledge_base': router.push('/dashboard/knowledge-base'); break;
      case 'ai_assistant': router.push('/dashboard/ai'); break;
      
      // Products
      case 'daftar_produk': router.push('/dashboard/products'); break;
      case 'kategori_produk': router.push('/dashboard/products/categories'); break;
      case 'satuan_produk': router.push('/dashboard/products/units'); break;

      // SOPs
      case 'sop_all': router.push('/dashboard/sops'); break;
      case 'sop_category_settings': router.push('/dashboard/sops/categories'); break;
      case 'sop_archive': router.push('/dashboard/sops/archive'); break;
      case 'sop_editor': router.push('/dashboard/sops/create'); break; // Logic might vary if editing specific ID

      // Clients
      case 'perusahaan_client': router.push('/dashboard/clients/companies'); break;
      case 'data_client': router.push('/dashboard/clients/contacts'); break;
      case 'pengaturan_kategori_client': router.push('/dashboard/clients/categories'); break;

      // Sales
      case 'daftar_penawaran': router.push('/dashboard/sales/quotations'); break;
      case 'buat_penawaran': router.push('/dashboard/sales/quotations/create'); break;
      case 'daftar_proforma': router.push('/dashboard/sales/proformas'); break;
      case 'buat_proforma': router.push('/dashboard/sales/proformas/create'); break;
      case 'daftar_invoice': router.push('/dashboard/sales/invoices'); break;
      case 'buat_invoice': router.push('/dashboard/sales/invoices/create'); break;
      case 'request_invoice': router.push('/dashboard/sales/invoice-requests'); break;
      case 'buat_request_invoice': router.push('/dashboard/sales/invoice-requests/create'); break;

      case 'penomoran_otomatis': router.push('/dashboard/sales/settings/autonumber'); break;
      case 'pengaturan_pajak': router.push('/dashboard/sales/settings/tax'); break;
      case 'pengaturan_template_pdf': router.push('/dashboard/sales/settings/templates'); break;

      // Settings
      case 'pengaturan_perusahaan': router.push('/dashboard/settings/company'); break;
      case 'workspace_email_config': router.push('/dashboard/settings/email'); break;
      case 'anggota_tim': router.push('/dashboard/settings/team'); break;
      case 'manajemen_role': router.push('/dashboard/settings/roles'); break;
      case 'profil_saya': router.push('/dashboard/settings/profile'); break;
      case 'pengaturan_ai': router.push('/dashboard/settings/ai'); break;
      
      // Project Settings
      case 'pengaturan_project_pipeline': router.push('/dashboard/settings/projects/pipelines'); break;
      case 'pengaturan_task_pipeline': router.push('/dashboard/settings/projects/task-stages'); break;

      // Special cases
      case 'create_workspace_wizard': 
         break;

      default: 
        if (viewId.startsWith('deals_')) {
             const id = viewId.split('_')[1];
             router.push(`/dashboard/deals/${id}`);
        } else if (viewId.startsWith('projects_')) {
             const id = viewId.split('_')[1];
             router.push(`/dashboard/projects/${id}`);
        } else if (viewId.startsWith('sop_cat_')) {
             const id = viewId.split('_')[2];
             router.push(`/dashboard/sops/category/${id}`);
        } else {
            console.warn("Unknown view or handled elsewhere:", viewId);
            // Try to push to dashboard/viewId as fallback if simple mapping
            // router.push(`/dashboard/${viewId}`);
        }
        break;
    }
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
          if (user.platform_role === 'ADMIN' && !activeCompany) {
             // We need to import PlatformAdminView
             // But PlatformAdminView was also a "View". 
             // If we are route-based, /dashboard should probably show AdminView if admin?
             // Or maybe we treat AdminView as just another child?
             // BUT, if we conform to "renderContent" logic:
             return <PlatformAdminView activeView={getActiveView()} onSettingsUpdate={() => {}} onRefresh={() => window.location.reload()} />;
          }

          if (!activeCompany) {
             return (
                <div className="flex h-screen items-center justify-center bg-gray-50">
                   <div className="text-center space-y-6">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Selamat Datang, {user.full_name}</h2>
                        <p className="text-gray-500 mt-2">Silakan pilih workspace untuk memulai.</p>
                      </div>
                      <button 
                        onClick={() => setShowWizard(true)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all"
                      >
                        Buat Workspace Baru
                      </button>
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
