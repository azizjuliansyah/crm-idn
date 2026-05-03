'use client';

import React from 'react';
import { WorkspaceSelector } from './WorkspaceSelector';
import { NavMenu } from './NavMenu';
import { AdminNavMenu } from './AdminNavMenu';
import { SidebarFooter } from './SidebarFooter';
import { Company, PlatformSettings, Profile, Pipeline, ProjectPipeline, SalesRequestCategory } from '@/lib/types';

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isSidebarVisible: boolean;
  activeCompany: Company | null;
  companies: Company[];
  switchCompany: (company: Company | null) => void;
  platformSettings: PlatformSettings;
  isAdmin: boolean;
  user: Profile;
  currentRoleName: string;
  onLogout: () => void;
  activeView: string;
  userPermissions: string[];
  pipelines: Pipeline[];
  projectPipelines: ProjectPipeline[];
  salesRequestCategories: SalesRequestCategory[];
  // Shared state for menus
  menuStates: {
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
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  isSidebarVisible,
  activeCompany,
  companies,
  switchCompany,
  platformSettings,
  isAdmin,
  user,
  currentRoleName,
  onLogout,
  activeView,
  userPermissions,
  pipelines,
  projectPipelines,
  salesRequestCategories,
  menuStates
}) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99] lg:hidden transition-opacity duration-300" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed inset-y-0 left-0 z-[100] w-[300px] ${isAdmin && !activeCompany ? 'bg-black' : 'bg-[#081526]'} border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out will-change-transform
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isSidebarVisible ? 'lg:translate-x-0' : 'lg:-translate-x-full'}
      `}>
        <WorkspaceSelector 
          activeCompany={activeCompany}
          companies={companies}
          switchCompany={switchCompany}
          platformSettings={platformSettings}
          isAdmin={isAdmin}
          onLogout={onLogout}
        />

        {isAdmin && !activeCompany ? (
          <AdminNavMenu setIsSidebarOpen={setIsSidebarOpen} />
        ) : (
          <NavMenu 
            activeView={activeView}
            userPermissions={userPermissions}
            pipelines={pipelines}
            projectPipelines={projectPipelines}
            salesRequestCategories={salesRequestCategories}
            setIsSidebarOpen={setIsSidebarOpen}
            {...menuStates}
          />
        )}

        <SidebarFooter 
          user={user}
          currentRoleName={currentRoleName}
          onLogout={onLogout}
          setIsSidebarOpen={setIsSidebarOpen}
          isAdmin={isAdmin}
          activeCompany={activeCompany}
        />
      </aside>
    </>
  );
};
