'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Input, Button, H1, H2, Subtext, Label } from '@/components/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getPathFromViewId } from '@/lib/navigation';

import {
  LayoutDashboard, Building2, Users, Settings, LogOut, ShieldCheck, ChevronDown,
  Search, Check, Monitor, User, LayoutGrid, ChevronRight, Target, Trello, Command,
  ArrowUpDown, Layers, Contact, Factory, Tags, Users2, Database, Share2, Package,
  Boxes, Weight, ReceiptCent, FileText, FileCheck, Hash, Coins, Palette, BookOpen,
  BrainCircuit, Headset, LifeBuoy, Ticket, ShieldAlert, Globe, FileBadge, Mail,
  Briefcase, Workflow, CheckSquare, FileQuestion, BookMarked, Archive, Sparkles, Menu, MessageSquare
} from 'lucide-react';
import { Profile, Company, PlatformSettings, Pipeline, ProjectPipeline, SalesRequestCategory } from '@/lib/types';
import { supabase } from '@/lib/supabase';

import { useAppStore } from '@/lib/store/useAppStore';
import { usePathname } from 'next/navigation';
import { getViewIdFromPath } from '@/lib/navigation';
import { Skeleton } from '@/components/ui';

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
    switchCompany: onCompanyChange,
    platformSettings,
    logout: onLogout
  } = useAppStore();

  if (!user) return null;

  const isAdmin = user.platform_role === 'ADMIN';
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [currentRoleName, setCurrentRoleName] = useState<string>('');

  const [isCrmOpen, setIsCrmOpen] = useState(false);
  const [isDealsExpanded, setIsDealsExpanded] = useState(false);
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isSalesOpen, setIsSalesOpen] = useState(false);
  const [isRequestsExpanded, setIsRequestsExpanded] = useState(false);
  const [isClientOpen, setIsClientOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);

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
    ].includes(activeView)) {
      setIsSettingsOpen(true);
    }
  }, [activeView]);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [projectPipelines, setProjectPipelines] = useState<ProjectPipeline[]>([]);
  const [salesRequestCategories, setSalesRequestCategories] = useState<SalesRequestCategory[]>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const ALL_POSSIBLE_MENU_LABELS = [
    'Dashboard', 'Leads', 'Deals', 'Projects', 'Perusahaan', 'Anggota Tim', 'Manajemen Role',
    'Pengaturan Leads', 'Pengaturan Deals Pipeline', 'Project Pipeline', 'Task Pipeline',
    'Data Client', 'Perusahaan Client', 'Pengaturan Kategori Client', 'Pengaturan Sumber Leads',
    'Produk', 'Kategori Produk', 'Satuan', 'Penjualan', 'Penawaran', 'Proforma Invoice',
    'Invoice', 'Kwitansi', 'Pengaturan Penjualan', 'Penomoran Otomatis', 'Pengaturan Pajak',
    'Template Dokumen', 'Knowledge Base', 'Pengaturan AI', 'Customer Support',
    'Support Pipeline', 'Konfigurasi Email', 'Request Invoice', 'Ticket Topic', 'Tingkat Urgensi'
  ];

  const fetchPipelines = useCallback(async () => {
    if (!activeCompany) return;
    try {
      const [dealsRes, projectsRes, salesReqRes] = await Promise.all([
        supabase.from('pipelines').select('*').eq('company_id', activeCompany.id).order('id'),
        supabase.from('project_pipelines').select('*').eq('company_id', activeCompany.id).order('id'),
        supabase.from('sales_request_categories').select('*').eq('company_id', activeCompany.id).order('sort_order', { ascending: true })
      ]);
      if (dealsRes.data) setPipelines(dealsRes.data as any);
      if (projectsRes.data) setProjectPipelines(projectsRes.data as any);
      if (salesReqRes.data) setSalesRequestCategories(salesReqRes.data as any);
    } catch (error) {
      console.error('Error fetching layout data:', error);
    } finally {
      setIsLoadingData(false);
    }
  }, [activeCompany?.id]); // Only change if company ID actually changes

  const activeStates = useMemo(() => ({
    isCrmActive: ['leads', 'pengaturan_leads', 'pengaturan_sumber_leads', 'deals', 'pengaturan_deals_pipeline', 'log_activity'].includes(activeView) || activeView.startsWith('deals_'),
    isProjectActive: ['projects'].includes(activeView) || activeView.startsWith('projects_'),
    isSupportActive: ['customer_support', 'complaints', 'knowledge_base', 'support_pipeline'].includes(activeView),
    isSalesActive: ['daftar_penawaran', 'buat_penawaran', 'edit_penawaran', 'daftar_proforma', 'buat_proforma', 'edit_proforma', 'daftar_invoice', 'buat_invoice', 'edit_invoice', 'daftar_kwitansi', 'buat_kwitansi', 'edit_kwitansi', 'request_invoice', 'buat_request_invoice', 'edit_request_invoice', 'request_kwitansi', 'buat_request_kwitansi', 'edit_request_kwitansi'].includes(activeView),
    isClientActive: ['data_client', 'perusahaan_client', 'pengaturan_kategori_client'].includes(activeView),
    isSettingsActive: [
      'pengaturan_perusahaan', 'workspace_email_config', 'anggota_tim', 'manajemen_role',
      'pengaturan_leads', 'pengaturan_sumber_leads', 'pengaturan_deals_pipeline',
      'pengaturan_project_pipeline', 'pengaturan_task_pipeline', 'support_pipeline',
      'pengaturan_kategori_client', 'penomoran_otomatis', 'pengaturan_pajak',
      'pengaturan_template_pdf', 'kategori_produk', 'satuan_produk', 'pengaturan_ai',
      'pengaturan_ticket_topic', 'request_category_settings', 'pengaturan_urgensi_request'
    ].includes(activeView)
  }), [activeView]);

  useEffect(() => {
    const handlePipelinesUpdated = () => fetchPipelines();
    window.addEventListener('pipelinesUpdated', handlePipelinesUpdated);
    window.addEventListener('salesRequestCategoriesUpdated', handlePipelinesUpdated);
    return () => {
      window.removeEventListener('pipelinesUpdated', handlePipelinesUpdated);
      window.removeEventListener('salesRequestCategoriesUpdated', handlePipelinesUpdated);
    };
  }, [fetchPipelines]);

  useEffect(() => {
    const fetchPermissions = async () => {
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
    fetchPipelines();
  }, [isAdmin, activeCompany?.id, user.id, fetchPipelines]); // Changed to activeCompany?.id to prevent unnecessary re-runs

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCompanies = useMemo(() => {
    return companies
      .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.id - b.id);
  }, [companies, searchTerm]);

  const canShow = (label: string) => userPermissions.includes(label);

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

  const renderMenuItem = (id: string, label: string, icon: React.ReactNode, bgColorClass: string, iconColorClass: string = 'text-white') => {
    const path = getPathFromViewId(id);
    const isActive = activeView === id;

    return (
      <div className="relative group">
        {isActive && (
          <div className="absolute left-[-12px] top-2 bottom-2 w-1 bg-blue-600 rounded-r-full shadow-[0_0_10px_rgba(37,99,235,0.3)] z-10" />
        )}
        <Link
          href={path}
          prefetch={true}
          onClick={() => setIsSidebarOpen(false)}
          className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer ${isActive ? 'text-blue-600 font-bold' : 'text-gray-700 hover:bg-gray-50 font-medium'}`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-sm ${isActive ? 'bg-blue-600 text-white' : `${bgColorClass} ${iconColorClass}`}`}>
            {React.cloneElement(icon as React.ReactElement<any>, { size: 14 })}
          </div>
          <Label className={`text-[13px] !capitalize ! cursor-pointer ${isActive ? 'text-blue-600' : 'text-inherit'}`}>{label}</Label>
        </Link>
      </div>
    );
  };

  const renderSubMenuLevel1 = (id: string, label: string, icon: React.ReactNode, active: boolean) => {
    const path = getPathFromViewId(id);

    return (
      <div className="relative group">
        <Link
          href={path}
          prefetch={true}
          onClick={() => setIsSidebarOpen(false)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer ${active ? 'text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 font-medium'}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-1 h-1 flex items-center justify-center">
              {active && (
                <div className="w-1 h-1 bg-blue-600 rounded-full" />
              )}
            </div>
            <div className={`transition-colors ${active ? 'text-blue-600' : 'text-gray-400'}`}>
              {React.cloneElement(icon as React.ReactElement<any>, { size: 14 })}
            </div>
            <Label className={`text-[12px] !capitalize ! cursor-pointer ${active ? 'text-blue-600' : 'text-inherit'}`}>{label}</Label>
          </div>
        </Link>
      </div>
    );
  };

  const renderSubMenuLevel2 = (id: string, label: string, active: boolean) => {
    const path = getPathFromViewId(id);

    return (
      <Link
        key={id}
        href={path}
        prefetch={true}
        onClick={() => setIsSidebarOpen(false)}
        className={`w-full flex items-center px-3 py-2 rounded-lg text-[11px] font-medium !capitalize ! transition-all cursor-pointer ${active ? 'text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-1 h-1 flex items-center justify-center">
            {active && (
              <div className="w-1 h-1 bg-blue-500 rounded-full" />
            )}
          </div>
          {label}
        </div>
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden text-gray-900 font-sans relative">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-30 lg:hidden transition-opacity cursor-pointer"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 bg-white border-r border-gray-100 flex flex-col z-40 shrink-0
        transition-all duration-300 ease-in-out
        ${isSidebarVisible ? 'w-64 lg:translate-x-0 lg:static' : 'w-0 lg:w-0 lg:-translate-x-full lg:static lg:border-none overflow-hidden'}
        ${isSidebarOpen ? 'translate-x-0 shadow-2xl w-64' : '-translate-x-full'}
      `}>
        {/* Workspace Selector */}
        <div className="p-4" ref={dropdownRef}>
          <div className="relative">
            <Button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              align="left" size='sm'
              className={`w-full group flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 border cursor-pointer !normal-case ! ${isDropdownOpen ? 'bg-white border-blue-100 shadow-xl shadow-blue-50 ring-4 ring-blue-50/50' : 'bg-white border-gray-100 hover:border-blue-200'}`}
            >
              <div className="relative">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-medium text-xs shadow-lg transition-transform group-hover:scale-105 duration-300 overflow-hidden ${(!activeCompany && isAdmin) ? 'bg-blue-600' : 'bg-gray-900'}`}>
                  {(!activeCompany && isAdmin) ? (
                    platformSettings.logo_url ? <img src={platformSettings.logo_url} className="w-full h-full object-cover" alt="Logo" /> : <Command size={20} />
                  ) : (
                    activeCompany?.logo_url ? <img src={activeCompany.logo_url} className="w-full h-full object-cover" alt="Logo" /> : (activeCompany?.name.charAt(0) || 'C')
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-sm">
                  <ArrowUpDown size={8} className="text-gray-400" />
                </div>
              </div>
              <div className="flex-1 text-left overflow-hidden">
                <Subtext className="text-[10px] text-gray-400 font-medium !capitalize ! mb-1">Workspace</Subtext>
                <H1 className="text-[13px] font-medium text-gray-900 truncate !capitalize !">
                  {(!activeCompany && isAdmin) ? 'Platform Central' : (activeCompany?.name || 'Pilih Tim')}
                </H1>
              </div>
              <ChevronDown size={14} className={`text-gray-300 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </Button>

            {isDropdownOpen && (
              <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 py-3">
                <div className="max-h-[60vh] flex flex-col">
                  {isAdmin && (
                    <div className="px-2 pb-2 mb-2 border-b border-gray-50">
                      <Button onClick={() => { onCompanyChange(null); setIsDropdownOpen(false); }} align="left" className={`w-full !px-3 !py-2 flex items-center gap-3 rounded-xl transition-all cursor-pointer !normal-case !h-auto ${!activeCompany ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-500'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${!activeCompany ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}><Monitor size={14} /></div>
                        <Label className="text-[11px] !capitalize !">Platform Central</Label>
                      </Button>
                    </div>
                  )}
                  <div className="px-3 pb-2"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={12} /><Input type="text" placeholder="Cari tim..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-gray-50/50 border border-gray-200 focus:border-blue-100 focus:bg-white rounded-xl text-[10px] font-medium outline-none transition-all" /></div></div>
                  <div className="px-2 space-y-1 overflow-y-auto custom-scrollbar">
                    {filteredCompanies.map(co => (
                      <Button key={co.id} onClick={() => { onCompanyChange(co); setIsDropdownOpen(false); }} align="left" className={`w-full !px-3 !py-2 flex items-center gap-3 rounded-xl transition-all !capitalize !normal-case !h-auto cursor-pointer ${activeCompany?.id === co.id ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-50 text-gray-500'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeCompany?.id === co.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{co.logo_url ? <img src={co.logo_url} className="w-full h-full object-cover rounded-lg" alt="Logo" /> : co.name.charAt(0)}</div>
                        <Label className="text-[11px] truncate !capitalize ! ">{co.name}</Label>
                      </Button>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-50 px-2 space-y-1">
                    <Link href={getPathFromViewId('profil_saya')} onClick={() => setIsDropdownOpen(false)} className="w-full px-3 py-2 flex items-center gap-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-all cursor-pointer group">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-white transition-colors"><User size={14} /></div>
                      <Label className="text-[10px] !capitalize ! cursor-pointer">Profil Saya</Label>
                    </Link>
                    <Button onClick={() => { onLogout(); setIsDropdownOpen(false); }} align="left" className="w-full !px-3 !py-2 flex items-center gap-3 rounded-xl text-rose-500 hover:bg-rose-50 transition-all cursor-pointer !normal-case !h-auto">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500"><LogOut size={14} /></div>
                      <Label className="text-[10px] !capitalize !">Logout Sesi</Label>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto">
          {activeCompany ? (
            <React.Fragment>
              {renderMenuItem('dashboard', 'Dashboard', <LayoutDashboard />, 'bg-blue-500')}

              {/* CRM Group */}
              {(canShow('Leads') || canShow('Deals')) && (
                <div className="space-y-0.5 relative group">
                  {activeStates.isCrmActive && (
                    <div className="absolute left-[-12px] top-2 bottom-2 w-1 bg-blue-600 rounded-r-full z-10" />
                  )}
                  <Button onClick={() => setIsCrmOpen(!isCrmOpen)} align="left" className={`w-full flex items-center justify-between !px-3 !py-2.5 rounded-xl transition-all font-medium cursor-pointer !normal-case !h-auto ${activeStates.isCrmActive ? 'text-blue-600' : isCrmOpen ? 'text-gray-900 bg-gray-50/50' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <div className="flex-1 flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-md ${activeStates.isCrmActive ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white'}`}><Target size={14} /></div>
                      <Label className={`text-[13px] !capitalize ! ${activeStates.isCrmActive ? 'text-blue-600 font-bold' : isCrmOpen ? 'text-gray-900 font-semibold' : 'text-inherit'}`}>CRM</Label>
                    </div>
                    <ChevronRight size={14} className={`transition-transform duration-300 ${isCrmOpen ? 'rotate-90 text-indigo-500' : activeStates.isCrmActive ? 'text-indigo-400' : 'text-gray-300'}`} />
                  </Button>
                  {isCrmOpen && (
                    <div className="space-y-0.5 mt-0.5 ml-8">
                      {canShow('Leads') && renderSubMenuLevel1('leads', 'Leads', <Target />, activeView === 'leads')}
                      {canShow('Deals') && (
                        <div className="space-y-0.5">
                          <Button
                            onClick={() => setIsDealsExpanded(!isDealsExpanded)}
                            align="left"
                            className={`w-full flex items-center gap-3 !px-3 !py-2 rounded-xl transition-all font-medium cursor-pointer !normal-case !h-auto ${(activeView === 'deals' || activeView.startsWith('deals_')) ? 'text-blue-600 font-bold' : isDealsExpanded ? 'text-gray-900 font-semibold bg-gray-50/50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-1 flex items-center justify-center">
                                {(activeView === 'deals' || activeView.startsWith('deals_')) && (
                                  <div className="w-1 h-1 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
                                )}
                              </div>
                              <div className={`${(activeView === 'deals' || activeView.startsWith('deals_')) ? 'text-blue-600' : isDealsExpanded ? 'text-indigo-600' : 'text-gray-300'}`}><Layers size={14} /></div>
                              <Label className="text-[12px] !capitalize !">Deals</Label>
                            </div>
                            <ChevronRight size={10} className={`transition-transform duration-300 ml-auto ${isDealsExpanded ? 'rotate-90 text-indigo-500' : 'text-gray-300'}`} />
                          </Button>
                          {isDealsExpanded && (
                            <div className="ml-[26px] mt-1 space-y-0.5">
                              {isLoadingData ? (
                                <div className="space-y-2 py-2">
                                  <Skeleton className="h-4 w-20" />
                                  <Skeleton className="h-4 w-24" />
                                </div>
                              ) : (
                                pipelines.map(p => renderSubMenuLevel2(`deals_${p.id}`, p.name, activeView === `deals_${p.id}`))
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {(canShow('Leads') || canShow('Deals')) && renderSubMenuLevel1('log_activity', 'Log Activity', <MessageSquare />, activeView === 'log_activity')}
                    </div>
                  )}
                </div>
              )}

              {/* Projects Group */}
              {canShow('Projects') && (
                <div className="space-y-0.5 relative group">
                  {activeStates.isProjectActive && (
                    <div className="absolute left-[-12px] top-2 bottom-2 w-1 bg-blue-600 rounded-r-full z-10 shadow-[0_0_10px_rgba(37,99,235,0.2)]" />
                  )}
                  <Button onClick={() => setIsProjectOpen(!isProjectOpen)} align="left" className={`w-full flex items-center justify-between !px-3 !py-2.5 rounded-xl transition-all font-medium cursor-pointer !normal-case !h-auto ${activeStates.isProjectActive ? 'text-blue-600' : isProjectOpen ? 'text-gray-900 bg-gray-50/50' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <div className="flex-1 flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-md ${activeStates.isProjectActive ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'}`}><Briefcase size={14} /></div>
                      <Label className={`text-[13px] !capitalize ! ${activeStates.isProjectActive ? 'text-blue-600 font-bold' : isProjectOpen ? 'text-gray-900 font-semibold' : 'text-inherit'}`}>Projects</Label>
                    </div>
                    <ChevronRight size={14} className={`transition-transform duration-300 ${isProjectOpen ? 'rotate-90 text-blue-600' : activeStates.isProjectActive ? 'text-blue-400' : 'text-gray-300'}`} />
                  </Button>
                  {isProjectOpen && (
                    <div className="ml-[58px] mt-1 space-y-0.5">
                      {isLoadingData ? (
                        <div className="space-y-2 py-2">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      ) : (
                        projectPipelines.map(p => renderSubMenuLevel2(`projects_${p.id}`, p.name, activeView === `projects_${p.id}`))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Customer Support Group */}
              {(canShow('Customer Support') || canShow('Knowledge Base')) && (
                <div className="space-y-0.5 relative group">
                  {activeStates.isSupportActive && (
                    <div className="absolute left-[-12px] top-2 bottom-2 w-1 bg-blue-600 rounded-r-full z-10 shadow-[0_0_10px_rgba(37,99,235,0.2)]" />
                  )}
                  <Button onClick={() => setIsSupportOpen(!isSupportOpen)} align="left" className={`w-full flex items-center justify-between !px-3 !py-2.5 rounded-xl transition-all font-medium cursor-pointer !normal-case !h-auto ${activeStates.isSupportActive ? 'text-blue-600' : isSupportOpen ? 'text-gray-900 bg-gray-50/50' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <div className="flex-1 flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-md ${activeStates.isSupportActive ? 'bg-rose-600 text-white' : 'bg-rose-500 text-white'}`}><Headset size={14} /></div>
                      <Label className={`text-[13px] !capitalize ! ${activeStates.isSupportActive ? 'text-blue-600 font-bold' : isSupportOpen ? 'text-gray-900 font-semibold' : 'text-inherit'}`}>Support</Label>
                    </div>
                    <ChevronRight size={14} className={`transition-transform duration-300 ${isSupportOpen ? 'rotate-90 text-rose-500' : activeStates.isSupportActive ? 'text-rose-400' : 'text-gray-300'}`} />
                  </Button>
                  {isSupportOpen && (
                    <div className="space-y-0.5 mt-0.5 ml-8">
                      {canShow('Customer Support') && renderSubMenuLevel1('customer_support', 'Ticket', <Ticket />, activeView === 'customer_support')}
                      {canShow('Customer Support') && renderSubMenuLevel1('complaints', 'Complaint', <ShieldAlert />, activeView === 'complaints')}
                      {canShow('Knowledge Base') && renderSubMenuLevel1('knowledge_base', 'Knowledge Base', <BookOpen />, activeView === 'knowledge_base')}
                    </div>
                  )}
                </div>
              )}

              {/* Penjualan Group */}
              {(canShow('Penawaran') || canShow('Proforma Invoice') || canShow('Invoice') || canShow('Kwitansi') || canShow('Request Invoice') || canShow('Request Kwitansi')) && (
                <div className="space-y-0.5 relative group">
                  {activeStates.isSalesActive && (
                    <div className="absolute left-[-12px] top-2 bottom-2 w-1 bg-blue-600 rounded-r-full z-10 shadow-[0_0_10px_rgba(37,99,235,0.2)]" />
                  )}
                  <Button onClick={() => setIsSalesOpen(!isSalesOpen)} align="left" className={`w-full flex items-center justify-between !px-3 !py-2.5 rounded-xl transition-all font-medium cursor-pointer !normal-case !h-auto ${activeStates.isSalesActive ? 'text-blue-600' : isSalesOpen ? 'text-gray-900 bg-gray-50/50' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <div className="flex-1 flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-md ${activeStates.isSalesActive ? 'bg-sky-600 text-white' : 'bg-sky-500 text-white'}`}><ReceiptCent size={14} /></div>
                      <Label className={`text-[13px] !capitalize ! ${activeStates.isSalesActive ? 'text-blue-600 font-bold' : isSalesOpen ? 'text-gray-900 font-semibold' : 'text-inherit'}`}>Penjualan</Label>
                    </div>
                    <ChevronRight size={14} className={`transition-transform duration-300 ${isSalesOpen ? 'rotate-90 text-sky-500' : activeStates.isSalesActive ? 'text-sky-400' : 'text-gray-300'}`} />
                  </Button>
                  {isSalesOpen && (
                    <div className="space-y-0.5 mt-0.5 ml-8">
                      {canShow('Penawaran') && renderSubMenuLevel1('daftar_penawaran', 'Penawaran', <FileText />, activeView === 'daftar_penawaran' || activeView === 'buat_penawaran' || activeView === 'edit_penawaran')}
                      {canShow('Proforma Invoice') && renderSubMenuLevel1('daftar_proforma', 'Proforma', <FileCheck />, activeView === 'daftar_proforma' || activeView === 'buat_proforma' || activeView === 'edit_proforma')}
                      {canShow('Invoice') && renderSubMenuLevel1('daftar_invoice', 'Invoice', <FileBadge />, activeView === 'daftar_invoice' || activeView === 'buat_invoice' || activeView === 'edit_invoice')}
                      {(canShow('Request Invoice') || canShow('Request Kwitansi')) && (
                        <div className="space-y-0.5">
                          <Button
                            onClick={() => setIsRequestsExpanded(!isRequestsExpanded)}
                            align="left"
                            className={`w-full flex items-center gap-3 !px-3 !py-2 rounded-xl transition-all font-medium cursor-pointer !normal-case !h-auto ${(activeView.includes('request_invoice') || activeView.includes('request_kwitansi')) ? 'text-blue-600 font-bold' : isRequestsExpanded ? 'text-gray-900 font-semibold bg-gray-50/50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-1 flex items-center justify-center">
                                {(activeView.includes('request_invoice') || activeView.includes('request_kwitansi')) && (
                                  <div className="w-1 h-1 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
                                )}
                              </div>
                              <div className={`${(activeView.includes('request_invoice') || activeView.includes('request_kwitansi')) ? 'text-blue-600' : isRequestsExpanded ? 'text-indigo-600' : 'text-gray-300'}`}><FileQuestion size={14} /></div>
                              <Label className="text-[12px] !capitalize !">Requests</Label>
                            </div>
                            <ChevronRight size={10} className={`transition-transform duration-300 ml-auto ${isRequestsExpanded ? 'rotate-90 text-indigo-500' : 'text-gray-300'}`} />
                          </Button>
                          {isRequestsExpanded && (
                            <div className="ml-[26px] mt-1 space-y-0.5">
                              {canShow('Request Invoice') && renderSubMenuLevel2('request_invoice', 'Request Invoice', activeView === 'request_invoice' || activeView === 'buat_request_invoice' || activeView === 'edit_request_invoice')}
                              {canShow('Request Kwitansi') && renderSubMenuLevel2('request_kwitansi', 'Request Kwitansi', activeView === 'request_kwitansi' || activeView === 'buat_request_kwitansi' || activeView === 'edit_request_kwitansi')}
                              {isLoadingData ? (
                                <div className="space-y-2 py-2">
                                  <Skeleton className="h-4 w-20" />
                                  <Skeleton className="h-4 w-24" />
                                </div>
                              ) : (
                                canShow('Akses Sales Request') && salesRequestCategories.map(cat => renderSubMenuLevel2(`request_cat_${cat.id}`, cat.name, activeView === `request_cat_${cat.id}` || activeView === `buat_request_cat_${cat.id}` || activeView === `edit_request_cat_${cat.id}`))
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {canShow('Produk') && renderMenuItem('daftar_produk', 'Produk', <Boxes />, 'bg-emerald-600')}

              {/* Client Group */}
              {(canShow('Data Client') || canShow('Perusahaan Client')) && (
                <div className="space-y-0.5 relative group">
                  {activeStates.isClientActive && (
                    <div className="absolute left-[-12px] top-2 bottom-2 w-1 bg-blue-600 rounded-r-full z-10 shadow-[0_0_10px_rgba(37,99,235,0.2)]" />
                  )}
                  <Button onClick={() => setIsClientOpen(!isClientOpen)} align="left" className={`w-full flex items-center justify-between !px-3 !py-2.5 rounded-xl transition-all font-medium cursor-pointer !normal-case !h-auto ${activeStates.isClientActive ? 'text-blue-600' : isClientOpen ? 'text-gray-900 bg-gray-50/50' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <div className="flex-1 flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-md ${activeStates.isClientActive ? 'bg-violet-600 text-white' : 'bg-violet-500 text-white'}`}><Users2 size={14} /></div>
                      <Label className={`text-[13px] !capitalize ! ${activeStates.isClientActive ? 'text-blue-600 font-bold' : isClientOpen ? 'text-gray-900 font-semibold' : 'text-inherit'}`}>Client</Label>
                    </div>
                    <ChevronRight size={14} className={`transition-transform duration-300 ${isClientOpen ? 'rotate-90 text-violet-500' : activeStates.isClientActive ? 'text-violet-400' : 'text-gray-300'}`} />
                  </Button>
                  {isClientOpen && (
                    <div className="space-y-0.5 mt-0.5 ml-8">
                      {canShow('Data Client') && renderSubMenuLevel1('data_client', 'Data Client', <Contact />, activeView === 'data_client')}
                      {canShow('Perusahaan Client') && renderSubMenuLevel1('perusahaan_client', 'Perusahaan Client', <Factory />, activeView === 'perusahaan_client')}
                    </div>
                  )}
                </div>
              )}

              {(canShow('Perusahaan') || canShow('Konfigurasi Email') || canShow('Anggota Tim') || canShow('Manajemen Role') ||
                canShow('Pengaturan Leads') || canShow('Pengaturan Sumber Leads') || canShow('Pengaturan Deals Pipeline') ||
                canShow('Project Pipeline') || canShow('Task Pipeline') || canShow('Support Pipeline') || canShow('Pengaturan Kategori Client') ||
                canShow('Penomoran Otomatis') || canShow('Pengaturan Pajak') || canShow('Template Dokumen') || canShow('Kategori Produk') ||
                canShow('Satuan') || canShow('Ticket Topic')) && (
                  <div className="space-y-0.5 relative group">
                    {activeStates.isSettingsActive && (
                      <div className="absolute left-[-12px] top-2 bottom-2 w-1 bg-blue-600 rounded-r-full z-10 shadow-[0_0_10px_rgba(37,99,235,0.2)]" />
                    )}
                    <Button onClick={() => setIsSettingsOpen(!isSettingsOpen)} align="left" className={`w-full flex items-center justify-between !px-3 !py-2.5 rounded-xl transition-all font-medium cursor-pointer !normal-case !h-auto ${activeStates.isSettingsActive ? 'text-blue-600' : isSettingsOpen ? 'text-gray-900 bg-gray-50/50' : 'text-gray-500 hover:bg-gray-50'}`}>
                      <div className="flex-1 flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-md ${activeStates.isSettingsActive ? 'bg-amber-100 text-amber-600' : 'bg-amber-50 text-amber-500'}`}><Settings size={14} /></div>
                        <Label className={`text-[13px] !capitalize ! ${activeStates.isSettingsActive ? 'text-blue-600 font-bold' : isSettingsOpen ? 'text-gray-900 font-semibold' : 'text-inherit'}`}>Workspace Setup</Label>
                      </div>
                      <ChevronRight size={14} className={`transition-transform duration-300 ${isSettingsOpen ? 'rotate-90 text-amber-500' : activeStates.isSettingsActive ? 'text-amber-400' : 'text-gray-300'}`} />
                    </Button>
                    {isSettingsOpen && (
                      <div className="space-y-0.5 mt-0.5 ml-8 pb-4">
                        {/* UMUM & TIM */}
                        {(canShow('Perusahaan') || canShow('Konfigurasi Email') || canShow('Anggota Tim') || canShow('Manajemen Role')) && (
                          <div className="px-3 pb-1 pt-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Umum & Tim</div>
                        )}
                        {canShow('Perusahaan') && renderSubMenuLevel1('pengaturan_perusahaan', 'Identitas Umum', <Building2 />, activeView === 'pengaturan_perusahaan')}
                        {canShow('Konfigurasi Email') && renderSubMenuLevel1('workspace_email_config', 'Konfigurasi Email', <Mail />, activeView === 'workspace_email_config')}
                        {canShow('Anggota Tim') && renderSubMenuLevel1('anggota_tim', 'Anggota Tim', <Users />, activeView === 'anggota_tim')}
                        {canShow('Manajemen Role') && renderSubMenuLevel1('manajemen_role', 'Manajemen Role', <ShieldAlert />, activeView === 'manajemen_role')}

                        {/* CRM & PIPELINES */}
                        {(canShow('Pengaturan Leads') || canShow('Pengaturan Deals Pipeline') || canShow('Project Pipeline') || canShow('Task Pipeline') || canShow('Support Pipeline')) && (
                          <div className="px-3 pb-1 pt-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pipelines</div>
                        )}
                        {canShow('Pengaturan Leads') && renderSubMenuLevel1('pengaturan_leads', 'Leads Pipeline', <Target />, activeView === 'pengaturan_leads')}
                        {canShow('Pengaturan Deals Pipeline') && renderSubMenuLevel1('pengaturan_deals_pipeline', 'Deals Pipeline', <Layers />, activeView === 'pengaturan_deals_pipeline')}
                        {canShow('Project Pipeline') && renderSubMenuLevel1('pengaturan_project_pipeline', 'Project Pipeline', <Workflow />, activeView === 'pengaturan_project_pipeline')}
                        {canShow('Task Pipeline') && renderSubMenuLevel1('pengaturan_task_pipeline', 'Task Pipeline', <CheckSquare />, activeView === 'pengaturan_task_pipeline')}
                        {canShow('Support Pipeline') && renderSubMenuLevel1('support_pipeline', 'Support Pipeline', <LifeBuoy />, activeView === 'support_pipeline')}

                        {/* MASTER DATA */}
                        {(canShow('Pengaturan Kategori Client') || canShow('Pengaturan Sumber Leads') || canShow('Kategori Produk') || canShow('Satuan') || canShow('Pengaturan Kategori Request') || canShow('Tingkat Urgensi') || canShow('Ticket Topic')) && (
                          <div className="px-3 pb-1 pt-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Master Data</div>
                        )}
                        {canShow('Pengaturan Kategori Client') && renderSubMenuLevel1('pengaturan_kategori_client', 'Kategori Client', <Tags />, activeView === 'pengaturan_kategori_client')}
                        {canShow('Pengaturan Sumber Leads') && renderSubMenuLevel1('pengaturan_sumber_leads', 'Lead Sources', <Globe />, activeView === 'pengaturan_sumber_leads')}
                        {canShow('Kategori Produk') && renderSubMenuLevel1('kategori_produk', 'Kategori Produk', <LayoutGrid />, activeView === 'kategori_produk')}
                        {canShow('Satuan') && renderSubMenuLevel1('satuan_produk', 'Satuan Produk', <Weight />, activeView === 'satuan_produk')}
                        {canShow('Pengaturan Kategori Request') && renderSubMenuLevel1('request_category_settings', 'Kategori Request', <FileQuestion />, activeView === 'request_category_settings')}
                        {canShow('Tingkat Urgensi') && renderSubMenuLevel1('pengaturan_urgensi_request', 'Tingkat Urgensi', <ShieldAlert />, activeView === 'pengaturan_urgensi_request')}
                        {canShow('Ticket Topic') && renderSubMenuLevel1('pengaturan_ticket_topic', 'Ticket Topic', <Ticket />, activeView === 'pengaturan_ticket_topic')}

                        {/* FINANCE & DOCS */}
                        {(canShow('Penomoran Otomatis') || canShow('Pengaturan Pajak') || canShow('Template Dokumen') || canShow('Pengaturan AI')) && (
                          <div className="px-3 pb-1 pt-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Finance & Tools</div>
                        )}
                        {canShow('Penomoran Otomatis') && renderSubMenuLevel1('penomoran_otomatis', 'Format Nomor', <Hash />, activeView === 'penomoran_otomatis')}
                        {canShow('Pengaturan Pajak') && renderSubMenuLevel1('pengaturan_pajak', 'Pajak & Fee', <Coins />, activeView === 'pengaturan_pajak')}
                        {canShow('Template Dokumen') && renderSubMenuLevel1('pengaturan_template_pdf', 'PDF Templates', <Palette />, activeView === 'pengaturan_template_pdf')}
                        {canShow('Pengaturan AI') && renderSubMenuLevel1('pengaturan_ai', 'Konfigurasi Gemini', <BrainCircuit />, activeView === 'pengaturan_ai')}
                      </div>
                    )}
                  </div>
                )}
            </React.Fragment>
          ) : (
            <div className="space-y-1">
              {renderMenuItem('dashboard', 'Dashboard', <LayoutDashboard />, 'bg-blue-500')}
              {isAdmin && (
                <>
                  {renderMenuItem('perusahaan', 'Workspace', <Building2 />, 'bg-emerald-500')}
                  {renderMenuItem('pengguna', 'Pengguna', <Users />, 'bg-purple-500')}
                  {renderMenuItem('pengaturan', 'Platform', <ShieldCheck />, 'bg-orange-500')}
                  {renderMenuItem('pengaturan_email', 'Email System', <Mail />, 'bg-indigo-500')}
                  {renderMenuItem('data_paket', 'Data Paket', <Package />, 'bg-rose-500')}
                </>
              )}
            </div>
          )}
        </nav>

        {/* Footer User Info */}
        <div className="p-4 border-t border-gray-50 flex items-center justify-between gap-2 bg-gray-50/30">
          <Link href={getPathFromViewId('profil_saya')} className="flex-1 flex items-center gap-3 overflow-hidden p-2 rounded-xl text-left cursor-pointer hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-100 group" onClick={() => setIsSidebarOpen(false)}>
            <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-300 overflow-hidden shrink-0 shadow-sm group-hover:border-blue-100 transition-colors">
              {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" alt="Avatar" /> : <User size={20} />}
            </div>
            <div className="overflow-hidden">
              <Subtext className="text-[11px] font-semibold text-gray-900 truncate ">{user.full_name}</Subtext>
              <Subtext className="text-[9px] text-gray-400 font-medium !capitalize ! truncate">{currentRoleName}</Subtext>
            </div>
          </Link>
          <Button onClick={onLogout} className="p-2.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer" title="Keluar Sesi"><LogOut size={16} /></Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-white overflow-hidden relative w-full">
        <header className={`sticky top-0 z-10 bg-white/80 backdrop-blur-md px-6 lg:px-10 h-20 flex items-center border-b border-gray-100 ${['buat_penawaran', 'edit_penawaran', 'buat_proforma', 'edit_proforma', 'buat_invoice', 'edit_invoice', 'buat_kwitansi', 'edit_kwitansi', 'buat_request_invoice', 'edit_request_invoice'].includes(activeView) ? 'hidden' : ''}`}>
          <Button
            onClick={() => {
              if (window.innerWidth < 1024) {
                setIsSidebarOpen(true);
              } else {
                setIsSidebarVisible(!isSidebarVisible);
              }
            }}
            variant="ghost"
            size="sm"
            className="p-2.5 mr-4 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all flex items-center justify-center"
          >
            <Menu size={20} />
          </Button>
          <H2 className="text-xl font-medium text-gray-900  capitalize truncate">{getDisplayHeader()}</H2>
        </header>
        <div className={`flex-1 overflow-y-auto custom-scrollbar ${['buat_penawaran', 'edit_penawaran', 'buat_proforma', 'edit_proforma', 'buat_invoice', 'edit_invoice', 'buat_kwitansi', 'edit_kwitansi', 'buat_request_invoice', 'edit_request_invoice'].includes(activeView) ? 'p-0' : 'p-6 lg:p-10'}`}>{children}</div>
      </main>
    </div>
  );
};
