'use client';

import React from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, Target, Trello, Layers, Contact, Factory, Tags, 
  Database, Share2, Package, Boxes, Weight, ReceiptCent, FileText, 
  FileCheck, Hash, Coins, Palette, BookOpen, BrainCircuit, Headset, 
  LifeBuoy, Ticket, Globe, FileBadge, Mail, Briefcase, Workflow, 
  CheckSquare, FileQuestion, BookMarked, Archive, Sparkles, MessageSquare,
  ChevronRight, Settings, Users2, Building2, Users, ShieldCheck
} from 'lucide-react';
import { Button, Label, Subtext } from '@/components/ui';
import { getPathFromViewId } from '@/lib/navigation';
import { Pipeline, ProjectPipeline, SalesRequestCategory } from '@/lib/types';

interface NavMenuProps {
  activeView: string;
  userPermissions: string[];
  pipelines: Pipeline[];
  projectPipelines: ProjectPipeline[];
  salesRequestCategories: SalesRequestCategory[];
  setIsSidebarOpen: (open: boolean) => void;
  // Local states for collapsible menus
  isCrmOpen: boolean;
  setIsCrmOpen: (open: boolean) => void;
  isDealsExpanded: boolean;
  setIsDealsExpanded: (open: boolean) => void;
  isProjectOpen: boolean;
  setIsProjectOpen: (open: boolean) => void;
  isSupportOpen: boolean;
  setIsSupportOpen: (open: boolean) => void;
  isSalesOpen: boolean;
  setIsSalesOpen: (open: boolean) => void;
  isRequestsExpanded: boolean;
  setIsRequestsExpanded: (open: boolean) => void;
  isClientOpen: boolean;
  setIsClientOpen: (open: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
}

export const NavMenu: React.FC<NavMenuProps> = ({
  activeView,
  userPermissions,
  pipelines,
  projectPipelines,
  salesRequestCategories,
  setIsSidebarOpen,
  isCrmOpen, setIsCrmOpen,
  isDealsExpanded, setIsDealsExpanded,
  isProjectOpen, setIsProjectOpen,
  isSupportOpen, setIsSupportOpen,
  isSalesOpen, setIsSalesOpen,
  isRequestsExpanded, setIsRequestsExpanded,
  isClientOpen, setIsClientOpen,
  isSettingsOpen, setIsSettingsOpen,
}) => {
  const canShow = (label: string) => userPermissions.includes(label);

  const activeStates = {
    isCrmActive: ['leads', 'pengaturan_leads', 'pengaturan_sumber_leads', 'deals', 'pengaturan_deals_pipeline', 'log_activity'].includes(activeView) || activeView.startsWith('deals_'),
    isProjectActive: ['projects'].includes(activeView) || activeView.startsWith('projects_'),
    isSupportActive: ['customer_support', 'complaints', 'knowledge_base'].includes(activeView),
    isSalesActive: ['daftar_penawaran', 'buat_penawaran', 'edit_penawaran', 'daftar_proforma', 'buat_proforma', 'edit_proforma', 'daftar_invoice', 'buat_invoice', 'edit_invoice', 'daftar_kwitansi', 'buat_kwitansi', 'edit_kwitansi', 'request_invoice', 'buat_request_invoice', 'edit_request_invoice', 'request_kwitansi', 'buat_request_kwitansi', 'edit_request_kwitansi'].includes(activeView),
    isClientActive: ['data_client', 'perusahaan_client', 'pengaturan_kategori_client'].includes(activeView),
    isSettingsActive: [
      'pengaturan_perusahaan', 'workspace_email_config', 'anggota_tim', 'manajemen_role',
      'pengaturan_leads', 'pengaturan_sumber_leads', 'pengaturan_deals_pipeline',
      'pengaturan_project_pipeline', 'pengaturan_task_pipeline', 'support_pipeline',
      'pengaturan_kategori_client', 'penomoran_otomatis', 'pengaturan_pajak',
      'pengaturan_template_pdf', 'kategori_produk', 'satuan_produk', 'pengaturan_ai',
      'pengaturan_ticket_topic', 'request_category_settings'
    ].includes(activeView) || activeView.startsWith('request_cat_settings_')
  };

  const renderMenuItem = (id: string, label: string, icon: React.ReactNode, bgColorClass: string, iconColorClass: string = 'text-white') => {
    const path = getPathFromViewId(id);
    const isActive = activeView === id;

    return (
      <div className="relative group" key={id}>
        {isActive && (
          <div className="absolute left-[-12px] top-2 bottom-2 w-1 bg-blue-600 rounded-r-full shadow-[0_0_10px_rgba(37,99,235,0.3)] z-10" />
        )}
        <Link
          href={path}
          prefetch={true}
          onClick={() => setIsSidebarOpen(false)}
          className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all duration-300 cursor-pointer group/item ${isActive ? 'text-blue-400 bg-blue-400/10 font-bold' : 'text-gray-400 hover:text-gray-100 hover:bg-white/5 hover:translate-x-1 font-medium'}`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 shadow-sm ${isActive ? 'bg-blue-600 text-white shadow-blue-900/20' : `${bgColorClass} ${iconColorClass} group-hover/item:scale-110`}`}>
            {React.cloneElement(icon as React.ReactElement<any>, { size: 14 })}
          </div>
          <Label className={`text-[13px] !capitalize ! cursor-pointer transition-colors duration-300 ${isActive ? 'text-blue-400' : 'text-inherit group-hover/item:text-gray-100'}`}>{label}</Label>
        </Link>
      </div>
    );
  };

  const renderSubMenuLevel1 = (id: string, label: string, icon: React.ReactNode, active: boolean) => {
    const path = getPathFromViewId(id);

    return (
      <div className="relative group" key={id}>
        <Link
          href={path}
          prefetch={true}
          onClick={() => setIsSidebarOpen(false)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 cursor-pointer group/sub ${active ? 'text-blue-400 font-bold bg-blue-400/5' : 'text-gray-500 hover:text-gray-100 hover:bg-white/5 hover:translate-x-1 font-medium'}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-1 h-1 flex items-center justify-center">
              {active && (
                <div className="w-1 h-1 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
              )}
            </div>
            <div className={`transition-all duration-300 ${active ? 'text-blue-400 scale-110' : 'text-gray-500 group-hover/sub:text-blue-400 group-hover/sub:scale-110'}`}>
              {React.cloneElement(icon as React.ReactElement<any>, { size: 14 })}
            </div>
            <Label className="text-[12px] !capitalize ! cursor-pointer">{label}</Label>
          </div>
        </Link>
      </div>
    );
  };

  const renderSubMenuLevel2 = (id: string, label: string, active: boolean) => {
    const path = getPathFromViewId(id);

    return (
      <div className="relative group" key={id}>
        <Link
          href={path}
          prefetch={true}
          onClick={() => setIsSidebarOpen(false)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 cursor-pointer group/sub2 ${active ? 'text-blue-400 font-bold bg-blue-400/5' : 'text-gray-500 hover:text-gray-100 hover:bg-white/5 hover:translate-x-1 font-medium'}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-1 h-1 flex items-center justify-center ml-2">
              <div className={`w-1 h-1 rounded-full transition-all duration-300 ${active ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)] scale-125' : 'bg-gray-600 group-hover/sub2:bg-gray-400 group-hover/sub2:scale-110'}`} />
            </div>
            <Label className="text-[11px] !capitalize ! cursor-pointer">{label}</Label>
          </div>
        </Link>
      </div>
    );
  };

  return (
    <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto">
      {renderMenuItem('dashboard', 'Dashboard', <LayoutDashboard />, 'bg-blue-500')}

      {/* CRM Section */}
      <div className="mt-4 mb-2">
        <Subtext className="text-[10px] uppercase tracking-widest text-gray-600 font-bold px-3 mb-2 flex items-center gap-2">
          Operations
        </Subtext>
        <div className="space-y-0.5">
          <div className="relative">
              {activeStates.isCrmActive && (
                <div className="absolute left-[-12px] top-2 bottom-2 w-1 bg-blue-600 rounded-r-full z-10" />
              )}
              <Button onClick={() => setIsCrmOpen(!isCrmOpen)} variant="ghost-dark" align="left" className={`w-full flex items-center justify-between !px-3 !py-2.5 rounded-xl transition-all duration-300 font-medium cursor-pointer !normal-case !h-auto group/crm ${activeStates.isCrmActive ? 'text-blue-400 bg-blue-400/5' : isCrmOpen ? 'text-white bg-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                <div className="flex-1 flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 shadow-md ${activeStates.isCrmActive ? 'bg-indigo-600 text-white shadow-indigo-900/20' : 'bg-indigo-500 text-white group-hover/crm:scale-110'}`}><Target size={14} /></div>
                  <Label className={`text-[13px] !capitalize ! transition-colors duration-300 ${activeStates.isCrmActive ? 'text-blue-400 font-bold' : isCrmOpen ? 'text-white font-semibold' : 'text-inherit'}`}>CRM</Label>
                </div>
                <ChevronRight size={14} className={`transition-all duration-300 ${isCrmOpen ? 'rotate-90 text-indigo-400' : activeStates.isCrmActive ? 'text-indigo-400' : 'text-gray-600 group-hover/crm:translate-x-1'}`} />
              </Button>
              {isCrmOpen && (
                <div className="space-y-0.5 mt-0.5 ml-8">
                  {renderSubMenuLevel1('leads', 'Leads', <Trello />, activeView === 'leads')}
                  
                  <div className="space-y-0.5">
                      <Button
                        onClick={() => setIsDealsExpanded(!isDealsExpanded)}
                        variant="ghost-dark"
                        align="left"
                        className={`w-full flex items-center gap-3 !px-3 !py-2 rounded-xl transition-all duration-300 font-medium cursor-pointer !normal-case !h-auto group/deals ${(activeView === 'deals' || activeView.startsWith('deals_')) ? 'text-blue-400 font-bold bg-blue-400/5' : isDealsExpanded ? 'text-white font-semibold bg-white/5' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-1 flex items-center justify-center">
                            {(activeView === 'deals' || activeView.startsWith('deals_')) && (
                              <div className="w-1 h-1 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                            )}
                          </div>
                          <div className={`transition-all duration-300 ${(activeView === 'deals' || activeView.startsWith('deals_')) ? 'text-blue-400 scale-110' : isDealsExpanded ? 'text-indigo-400' : 'text-gray-300 group-hover/deals:text-blue-400 group-hover/deals:scale-110'}`}><Layers size={14} /></div>
                          <Label className="text-[12px] !capitalize ! cursor-pointer">Deals</Label>
                        </div>
                        <ChevronRight size={10} className={`transition-all duration-300 ml-auto ${isDealsExpanded ? 'rotate-90 text-indigo-400' : 'text-gray-300 group-hover/deals:translate-x-1'}`} />
                      </Button>
                      {isDealsExpanded && (
                        <div className="ml-[26px] mt-1 space-y-0.5">
                          {pipelines.map(p => renderSubMenuLevel2(`deals_${p.id}`, p.name, activeView === `deals_${p.id}`))}
                        </div>
                      )}
                    </div>
                  {renderSubMenuLevel1('log_activity', 'Log Activity', <MessageSquare />, activeView === 'log_activity')}
                </div>
              )}
            </div>

          <div className="relative">
              {activeStates.isProjectActive && (
                <div className="absolute left-[-12px] top-2 bottom-2 w-1 bg-blue-600 rounded-r-full z-10 shadow-[0_0_10px_rgba(37,99,235,0.2)]" />
              )}
              <Button onClick={() => setIsProjectOpen(!isProjectOpen)} variant="ghost-dark" align="left" className={`w-full flex items-center justify-between !px-3 !py-2.5 rounded-xl transition-all duration-300 font-medium cursor-pointer !normal-case !h-auto group/project ${activeStates.isProjectActive ? 'text-blue-400 bg-blue-400/5' : isProjectOpen ? 'text-white bg-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                <div className="flex-1 flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 shadow-md ${activeStates.isProjectActive ? 'bg-blue-600 text-white shadow-blue-900/20' : 'bg-blue-600 text-white group-hover/project:scale-110'}`}><Briefcase size={14} /></div>
                  <Label className={`text-[13px] !capitalize ! transition-colors duration-300 ${activeStates.isProjectActive ? 'text-blue-400 font-bold' : isProjectOpen ? 'text-white font-semibold' : 'text-inherit'}`}>Projects</Label>
                </div>
                <ChevronRight size={14} className={`transition-all duration-300 ${isProjectOpen ? 'rotate-90 text-blue-400' : activeStates.isProjectActive ? 'text-blue-400' : 'text-gray-600 group-hover/project:translate-x-1'}`} />
              </Button>
              {isProjectOpen && (
                <div className="space-y-0.5 mt-0.5 ml-8">
                  {projectPipelines.map(p => renderSubMenuLevel2(`projects_${p.id}`, p.name, activeView === `projects_${p.id}`))}
                </div>
              )}
            </div>

          <div className="relative">
              {activeStates.isSupportActive && (
                <div className="absolute left-[-12px] top-2 bottom-2 w-1 bg-blue-600 rounded-r-full z-10 shadow-[0_0_10px_rgba(37,99,235,0.2)]" />
              )}
              <Button onClick={() => setIsSupportOpen(!isSupportOpen)} variant="ghost-dark" align="left" className={`w-full flex items-center justify-between !px-3 !py-2.5 rounded-xl transition-all duration-300 font-medium cursor-pointer !normal-case !h-auto group/support ${activeStates.isSupportActive ? 'text-blue-400 bg-blue-400/5' : isSupportOpen ? 'text-white bg-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                <div className="flex-1 flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 shadow-md ${activeStates.isSupportActive ? 'bg-rose-600 text-white shadow-rose-900/20' : 'bg-rose-500 text-white group-hover/support:scale-110'}`}><Headset size={14} /></div>
                  <Label className={`text-[13px] !capitalize ! transition-colors duration-300 ${activeStates.isSupportActive ? 'text-blue-400 font-bold' : isSupportOpen ? 'text-white font-semibold' : 'text-inherit'}`}>Support</Label>
                </div>
                <ChevronRight size={14} className={`transition-all duration-300 ${isSupportOpen ? 'rotate-90 text-rose-400' : activeStates.isSupportActive ? 'text-rose-400' : 'text-gray-600 group-hover/support:translate-x-1'}`} />
              </Button>
              {isSupportOpen && (
                <div className="space-y-0.5 mt-0.5 ml-8">
                  {canShow('Knowledge Base') && renderSubMenuLevel1('knowledge_base', 'Knowledge Base', <BookOpen />, activeView === 'knowledge_base')}
                  {renderSubMenuLevel1('customer_support', 'Semua Ticket', <Ticket />, activeView === 'customer_support')}
                  {renderSubMenuLevel1('complaints', 'Complaints', <LifeBuoy />, activeView === 'complaints')}
                </div>
              )}
            </div>

          <div className="relative">
              {activeStates.isSalesActive && (
                <div className="absolute left-[-12px] top-2 bottom-2 w-1 bg-blue-600 rounded-r-full z-10 shadow-[0_0_10px_rgba(37,99,235,0.2)]" />
              )}
              <Button onClick={() => setIsSalesOpen(!isSalesOpen)} variant="ghost-dark" align="left" className={`w-full flex items-center justify-between !px-3 !py-2.5 rounded-xl transition-all duration-300 font-medium cursor-pointer !normal-case !h-auto group/sales ${activeStates.isSalesActive ? 'text-blue-400 bg-blue-400/5' : isSalesOpen ? 'text-white bg-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                <div className="flex-1 flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 shadow-md ${activeStates.isSalesActive ? 'bg-sky-600 text-white shadow-sky-900/20' : 'bg-sky-500 text-white group-hover/sales:scale-110'}`}><ReceiptCent size={14} /></div>
                  <Label className={`text-[13px] !capitalize ! transition-colors duration-300 ${activeStates.isSalesActive ? 'text-blue-400 font-bold' : isSalesOpen ? 'text-white font-semibold' : 'text-inherit'}`}>Penjualan</Label>
                </div>
                <ChevronRight size={14} className={`transition-all duration-300 ${isSalesOpen ? 'rotate-90 text-sky-400' : activeStates.isSalesActive ? 'text-sky-400' : 'text-gray-600 group-hover/sales:translate-x-1'}`} />
              </Button>
              {isSalesOpen && (
                <div className="space-y-0.5 mt-0.5 ml-8">
                  {canShow('Penawaran') && renderSubMenuLevel1('daftar_penawaran', 'Penawaran', <FileText />, activeView.includes('penawaran'))}
                  {canShow('Proforma Invoice') && renderSubMenuLevel1('daftar_proforma', 'Proforma', <FileCheck />, activeView.includes('proforma'))}
                  {canShow('Invoice') && renderSubMenuLevel1('daftar_invoice', 'Invoice', <Hash />, activeView.includes('invoice'))}
                  
                  <div className="space-y-0.5">
                    <Button
                      onClick={() => setIsRequestsExpanded(!isRequestsExpanded)}
                      variant="ghost-dark"
                      align="left"
                      className={`w-full flex items-center gap-3 !px-3 !py-2 rounded-xl transition-all duration-300 font-medium cursor-pointer !normal-case !h-auto group/reqs ${(activeView.includes('request_invoice') || activeView.includes('request_kwitansi')) ? 'text-blue-400 font-bold bg-blue-400/5' : isRequestsExpanded ? 'text-white font-semibold bg-white/5' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-1 flex items-center justify-center">
                          {(activeView.includes('request_invoice') || activeView.includes('request_kwitansi')) && (
                            <div className="w-1 h-1 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                          )}
                        </div>
                        <div className={`transition-all duration-300 ${(activeView.includes('request_invoice') || activeView.includes('request_kwitansi')) ? 'text-blue-400 scale-110' : isRequestsExpanded ? 'text-indigo-400' : 'text-gray-300 group-hover/reqs:text-blue-400 group-hover/reqs:scale-110'}`}><FileQuestion size={14} /></div>
                        <Label className="text-[12px] !capitalize ! cursor-pointer">Requests</Label>
                      </div>
                      <ChevronRight size={10} className={`transition-all duration-300 ml-auto ${isRequestsExpanded ? 'rotate-90 text-indigo-400' : 'text-gray-300 group-hover/reqs:translate-x-1'}`} />
                    </Button>
                    {isRequestsExpanded && (
                      <div className="ml-[26px] mt-1 space-y-0.5">
                        {renderSubMenuLevel2('request_invoice', 'Invoice', activeView.includes('request_invoice'))}
                        {renderSubMenuLevel2('request_kwitansi', 'Kwitansi', activeView.includes('request_kwitansi'))}
                        {salesRequestCategories.map(cat => renderSubMenuLevel2(`request_cat_${cat.id}`, cat.name, activeView === `request_cat_${cat.id}`))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          <div className="relative">
              {activeStates.isClientActive && (
                <div className="absolute left-[-12px] top-2 bottom-2 w-1 bg-blue-600 rounded-r-full z-10 shadow-[0_0_10px_rgba(37,99,235,0.2)]" />
              )}
              <Button onClick={() => setIsClientOpen(!isClientOpen)} variant="ghost-dark" align="left" className={`w-full flex items-center justify-between !px-3 !py-2.5 rounded-xl transition-all duration-300 font-medium cursor-pointer !normal-case !h-auto group/client ${activeStates.isClientActive ? 'text-blue-400 bg-blue-400/5' : isClientOpen ? 'text-white bg-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                <div className="flex-1 flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 shadow-md ${activeStates.isClientActive ? 'bg-violet-600 text-white shadow-violet-900/20' : 'bg-violet-500 text-white group-hover/client:scale-110'}`}><Users2 size={14} /></div>
                  <Label className={`text-[13px] !capitalize ! transition-colors duration-300 ${activeStates.isClientActive ? 'text-blue-400 font-bold' : isClientOpen ? 'text-white font-semibold' : 'text-inherit'}`}>Client</Label>
                </div>
                <ChevronRight size={14} className={`transition-all duration-300 ${isClientOpen ? 'rotate-90 text-violet-400' : activeStates.isClientActive ? 'text-violet-400' : 'text-gray-600 group-hover/client:translate-x-1'}`} />
              </Button>
              {isClientOpen && (
                <div className="space-y-0.5 mt-0.5 ml-8">
                  {renderSubMenuLevel1('data_client', 'Data Client', <Users2 />, activeView === 'data_client')}
                  {canShow('Perusahaan Client') && renderSubMenuLevel1('perusahaan_client', 'Perusahaan', <Building2 />, activeView === 'perusahaan_client')}
                </div>
              )}
            </div>

          {canShow('Produk') && renderMenuItem('daftar_produk', 'Produk', <Boxes />, 'bg-emerald-600')}
        </div>
      </div>

      {/* Settings Section */}
      <div className="mt-6 mb-4">
        <Subtext className="text-[10px] uppercase tracking-widest text-gray-600 font-bold px-3 mb-2">
          System Setup
        </Subtext>
        <div className="space-y-0.5">
          <div className="relative">
            {activeStates.isSettingsActive && (
              <div className="absolute left-[-12px] top-2 bottom-2 w-1 bg-blue-600 rounded-r-full z-10 shadow-[0_0_10px_rgba(37,99,235,0.2)]" />
            )}
            <Button onClick={() => setIsSettingsOpen(!isSettingsOpen)} variant="ghost-dark" align="left" className={`w-full flex items-center justify-between !px-3 !py-2.5 rounded-xl transition-all duration-300 font-medium cursor-pointer !normal-case !h-auto group/settings ${activeStates.isSettingsActive ? 'text-blue-400 bg-blue-400/5' : isSettingsOpen ? 'text-white bg-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <div className="flex-1 flex items-center gap-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 shadow-md ${activeStates.isSettingsActive ? 'bg-amber-500 text-white shadow-amber-900/20' : 'bg-amber-500 text-white group-hover/settings:scale-110'}`}><Settings size={14} /></div>
                <Label className={`text-[13px] !capitalize ! transition-colors duration-300 ${activeStates.isSettingsActive ? 'text-blue-400 font-bold' : isSettingsOpen ? 'text-white font-semibold' : 'text-inherit'}`}>Workspace Setup</Label>
              </div>
              <ChevronRight size={14} className={`transition-all duration-300 ${isSettingsOpen ? 'rotate-90 text-amber-400' : activeStates.isSettingsActive ? 'text-amber-400' : 'text-gray-600 group-hover/settings:translate-x-1'}`} />
            </Button>
            {isSettingsOpen && (
              <div className="space-y-4 mt-2 ml-8 pb-4">
                {/* General Group */}
                <div className="space-y-0.5">
                  <div className="text-[9px] uppercase tracking-wider text-gray-600 font-bold px-3 mb-1">General</div>
                  {renderSubMenuLevel1('pengaturan_perusahaan', 'Workspace Info', <Building2 />, activeView === 'pengaturan_perusahaan')}
                  {renderSubMenuLevel1('workspace_email_config', 'Email Config', <Mail />, activeView === 'workspace_email_config')}
                  {renderSubMenuLevel1('pengaturan_ai', 'IDN Brain (AI)', <BrainCircuit />, activeView === 'pengaturan_ai')}
                </div>

                {/* Users Group */}
                <div className="space-y-0.5">
                  <div className="text-[9px] uppercase tracking-wider text-gray-600 font-bold px-3 mb-1">Users & Access</div>
                  {renderSubMenuLevel1('anggota_tim', 'Anggota Tim', <Users />, activeView === 'anggota_tim')}
                  {renderSubMenuLevel1('manajemen_role', 'Hak Akses', <ShieldCheck />, activeView === 'manajemen_role')}
                </div>

                {/* Sales & Finance */}
                <div className="space-y-0.5">
                  <div className="text-[9px] uppercase tracking-wider text-gray-600 font-bold px-3 mb-1">Sales & Finance</div>
                  {renderSubMenuLevel1('penomoran_otomatis', 'Penomoran', <Hash />, activeView === 'penomoran_otomatis')}
                  {renderSubMenuLevel1('pengaturan_pajak', 'Pajak & Biaya', <Coins />, activeView === 'pengaturan_pajak')}
                  {renderSubMenuLevel1('pengaturan_template_pdf', 'PDF Templates', <Palette />, activeView === 'pengaturan_template_pdf')}
                  {renderSubMenuLevel1('request_category_settings', 'Req Categories', <Workflow />, activeView === 'request_category_settings' || activeView.startsWith('request_cat_settings_'))}
                </div>

                {/* Product & Client */}
                <div className="space-y-0.5">
                  <div className="text-[9px] uppercase tracking-wider text-gray-600 font-bold px-3 mb-1">Product & Client</div>
                  {renderSubMenuLevel1('kategori_produk', 'Kategori Produk', <Tags />, activeView === 'kategori_produk')}
                  {renderSubMenuLevel1('satuan_produk', 'Satuan Produk', <Weight />, activeView === 'satuan_produk')}
                  {renderSubMenuLevel1('pengaturan_kategori_client', 'Kategori Client', <Tags />, activeView === 'pengaturan_kategori_client')}
                </div>

                {/* Pipelines */}
                <div className="space-y-0.5">
                  <div className="text-[9px] uppercase tracking-wider text-gray-600 font-bold px-3 mb-1">Workflows</div>
                  {renderSubMenuLevel1('pengaturan_leads', 'Settings Leads', <Trello />, activeView === 'pengaturan_leads')}
                  {renderSubMenuLevel1('pengaturan_sumber_leads', 'Sumber Leads', <Share2 />, activeView === 'pengaturan_sumber_leads')}
                  {renderSubMenuLevel1('pengaturan_deals_pipeline', 'Pipeline Deals', <Layers />, activeView === 'pengaturan_deals_pipeline')}
                  {renderSubMenuLevel1('pengaturan_project_pipeline', 'Pipeline Project', <Briefcase />, activeView === 'pengaturan_project_pipeline')}
                  {renderSubMenuLevel1('pengaturan_task_pipeline', 'Pipeline Task', <CheckSquare />, activeView === 'pengaturan_task_pipeline')}
                  {renderSubMenuLevel1('support_pipeline', 'Pipeline Support', <Ticket />, activeView === 'support_pipeline')}
                  {renderSubMenuLevel1('pengaturan_ticket_topic', 'Ticket Topics', <MessageSquare />, activeView === 'pengaturan_ticket_topic')}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
