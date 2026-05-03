'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store/useAppStore';
import { getViewIdFromPath } from '@/lib/navigation';
import { Pipeline, ProjectPipeline, SalesRequestCategory } from '@/lib/types';
import { Sidebar } from './sidebar/Sidebar';
import { Header } from './header/Header';

const ALL_POSSIBLE_MENU_LABELS = [
  'Dashboard', 'CRM', 'Leads', 'Deals', 'Log Activity', 'Projects', 
  'Support', 'Knowledge Base', 'Customer Support', 'Penjualan', 
  'Penawaran', 'Proforma Invoice', 'Invoice', 'Kwitansi', 
  'Request Invoice', 'Request Kwitansi', 'Client', 'Data Client', 
  'Perusahaan Client', 'Produk'
];

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const activeView = getViewIdFromPath(pathname);
  
  const {
    user,
    companies,
    activeCompany,
    switchCompany,
    platformSettings,
    logout: onLogout
  } = useAppStore();

  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [currentRoleName, setCurrentRoleName] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  
  // Menu expansion states
  const [isCrmOpen, setIsCrmOpen] = useState(false);
  const [isDealsExpanded, setIsDealsExpanded] = useState(false);
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isSalesOpen, setIsSalesOpen] = useState(false);
  const [isRequestsExpanded, setIsRequestsExpanded] = useState(false);
  const [isClientOpen, setIsClientOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [projectPipelines, setProjectPipelines] = useState<ProjectPipeline[]>([]);
  const [salesRequestCategories, setSalesRequestCategories] = useState<SalesRequestCategory[]>([]);

  const isAdmin = user?.platform_role === 'ADMIN';

  // Auto-expand menus based on activeView
  useEffect(() => {
    if (['leads', 'pengaturan_leads', 'pengaturan_sumber_leads', 'deals', 'pengaturan_deals_pipeline', 'log_activity'].includes(activeView) || activeView.startsWith('deals_')) {
      setIsCrmOpen(true);
    }
    if (['deals', 'pengaturan_deals_pipeline'].includes(activeView) || activeView.startsWith('deals_')) {
      setIsDealsExpanded(true);
    }
    if (['projects'].includes(activeView) || activeView.startsWith('projects_')) {
      setIsProjectOpen(true);
    }
    if (['customer_support', 'complaints', 'knowledge_base', 'support_pipeline'].includes(activeView)) {
      setIsSupportOpen(true);
    }
    if (['daftar_penawaran', 'buat_penawaran', 'edit_penawaran', 'daftar_proforma', 'buat_proforma', 'edit_proforma', 'daftar_invoice', 'buat_invoice', 'edit_invoice', 'daftar_kwitansi', 'buat_kwitansi', 'edit_kwitansi', 'request_invoice', 'buat_request_invoice', 'edit_request_invoice', 'request_kwitansi', 'buat_request_kwitansi', 'edit_request_kwitansi'].includes(activeView)) {
      setIsSalesOpen(true);
    }
    if (['request_invoice', 'buat_request_invoice', 'edit_request_invoice', 'request_kwitansi', 'buat_request_kwitansi', 'edit_request_kwitansi'].includes(activeView)) {
      setIsRequestsExpanded(true);
    }
    if (['data_client', 'perusahaan_client', 'pengaturan_kategori_client'].includes(activeView)) {
      setIsClientOpen(true);
    }
    if ([
      'pengaturan_perusahaan', 'workspace_email_config', 'anggota_tim', 'manajemen_role',
      'pengaturan_leads', 'pengaturan_sumber_leads', 'pengaturan_deals_pipeline',
      'pengaturan_project_pipeline', 'pengaturan_task_pipeline', 'support_pipeline',
      'pengaturan_kategori_client', 'penomoran_otomatis', 'pengaturan_pajak',
      'pengaturan_template_pdf', 'kategori_produk', 'satuan_produk', 'pengaturan_ai',
      'pengaturan_ticket_topic', 'request_category_settings'
    ].includes(activeView) || activeView.startsWith('request_cat_settings_')) {
      setIsSettingsOpen(true);
    }
  }, [activeView]);

  const fetchPipelines = useCallback(async () => {
    if (!activeCompany) return;
    try {
      const [{ data: pData }, { data: ppData }, { data: scData }] = await Promise.all([
        supabase.from('pipelines').select('*').eq('company_id', activeCompany.id).order('created_at'),
        supabase.from('project_pipelines').select('*').eq('company_id', activeCompany.id).order('created_at'),
        supabase.from('sales_request_categories').select('*').eq('company_id', activeCompany.id).order('sort_order')
      ]);
      setPipelines(pData || []);
      setProjectPipelines(ppData || []);
      setSalesRequestCategories(scData || []);
    } catch (error) {
      console.error('Error fetching navigation data:', error);
    }
  }, [activeCompany]);

  useEffect(() => {
    fetchPipelines();
    const handlePipelinesUpdated = () => fetchPipelines();
    window.addEventListener('pipelinesUpdated', handlePipelinesUpdated);
    window.addEventListener('projectPipelinesUpdated', handlePipelinesUpdated);
    window.addEventListener('salesRequestCategoriesUpdated', handlePipelinesUpdated);
    return () => {
      window.removeEventListener('pipelinesUpdated', handlePipelinesUpdated);
      window.removeEventListener('projectPipelinesUpdated', handlePipelinesUpdated);
      window.removeEventListener('salesRequestCategoriesUpdated', handlePipelinesUpdated);
    };
  }, [fetchPipelines]);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user) return;
      if (isAdmin && !activeCompany) {
        setUserPermissions(ALL_POSSIBLE_MENU_LABELS);
        setCurrentRoleName('Super Admin');
        return;
      }

      if (activeCompany) {
        const { data } = await supabase
          .from('company_members')
          .select('company_roles(name, permissions)')
          .eq('company_id', activeCompany.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (data && (data as any).company_roles) {
          const roleData = (data as any).company_roles;
          setCurrentRoleName(roleData.name);
          const perms = [...(roleData.permissions || [])];

          if (perms.includes('Dashboard')) {
            const autoDashboard = ['Data Client', 'Perusahaan Client', 'Produk', 'Projects', 'Penjualan', 'Penawaran', 'Proforma Invoice', 'Invoice', 'Kwitansi', 'Knowledge Base', 'Customer Support', 'Request Invoice', 'Request Kwitansi'];
            autoDashboard.forEach(p => { if (!perms.includes(p)) perms.push(p); });
          }
          setUserPermissions(perms);
        } else if (isAdmin) {
          setUserPermissions(ALL_POSSIBLE_MENU_LABELS);
          setCurrentRoleName('Super Admin');
        } else {
          setUserPermissions(['Dashboard', 'Data Client', 'Perusahaan Client', 'Produk', 'Penjualan', 'Knowledge Base', 'Customer Support']);
          setCurrentRoleName('Member');
        }
      }
    };

    fetchPermissions();
  }, [isAdmin, activeCompany?.id, user?.id]);

  const getDisplayHeader = () => {
    if (activeView === 'pengaturan_perusahaan') return 'Pengaturan Umum';
    if (activeView === 'pengaturan_email') return 'Integrasi Mailketing API';
    if (activeView.startsWith('deals_')) {
      const id = parseInt(activeView.split('_')[1]);
      return `Deals: ${pipelines.find(p => p.id === id)?.name || 'Loading...'}`;
    }
    if (activeView.startsWith('projects_')) {
      const id = parseInt(activeView.split('_')[1]);
      return `Project: ${projectPipelines.find(p => p.id === id)?.name || 'Loading...'}`;
    }
    if (activeView.startsWith('request_cat_')) {
      const id = parseInt(activeView.split('_')[2]);
      return `${salesRequestCategories.find(c => c.id === id)?.name || 'Sales Request'}`;
    }
    if (activeView.startsWith('buat_request_cat_')) {
      const id = parseInt(activeView.split('_')[3]);
      return `Buat ${salesRequestCategories.find(c => c.id === id)?.name || 'Sales Request'}`;
    }
    if (activeView.startsWith('edit_request_cat_')) {
      const id = parseInt(activeView.split('_')[3]);
      return `Edit ${salesRequestCategories.find(c => c.id === id)?.name || 'Sales Request'}`;
    }
    return activeView.replace(/_/g, ' ');
  };

  if (!user) return null;

  const menuStates = {
    isCrmOpen, setIsCrmOpen,
    isDealsExpanded, setIsDealsExpanded,
    isProjectOpen, setIsProjectOpen,
    isSupportOpen, setIsSupportOpen,
    isSalesOpen, setIsSalesOpen,
    isRequestsExpanded, setIsRequestsExpanded,
    isClientOpen, setIsClientOpen,
    isSettingsOpen, setIsSettingsOpen
  };

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      <Sidebar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isSidebarVisible={isSidebarVisible}
        activeCompany={activeCompany}
        companies={companies}
        switchCompany={switchCompany}
        platformSettings={platformSettings}
        isAdmin={isAdmin}
        user={user}
        currentRoleName={currentRoleName}
        onLogout={onLogout}
        activeView={activeView}
        userPermissions={userPermissions}
        pipelines={pipelines}
        projectPipelines={projectPipelines}
        salesRequestCategories={salesRequestCategories}
        menuStates={menuStates}
      />

      <main className={`flex-1 flex flex-col bg-white text-gray-900 overflow-hidden relative w-full transition-[padding] duration-300 ease-in-out will-change-[padding] ${isSidebarVisible ? 'lg:pl-[300px]' : 'lg:pl-0'}`}>
        <Header 
          isAdmin={isAdmin}
          activeCompany={activeCompany}
          activeView={activeView}
          setIsSidebarOpen={setIsSidebarOpen}
          isSidebarVisible={isSidebarVisible}
          setIsSidebarVisible={setIsSidebarVisible}
          displayHeader={getDisplayHeader()}
        />
        <div className={`flex-1 overflow-y-auto custom-scrollbar ${['buat_penawaran', 'edit_penawaran', 'buat_proforma', 'edit_proforma', 'buat_invoice', 'edit_invoice', 'buat_kwitansi', 'edit_kwitansi', 'buat_request_invoice', 'edit_request_invoice'].includes(activeView) ? 'p-0' : 'p-6 lg:p-10'}`}>
          {children}
        </div>
      </main>
    </div>
  );
};
