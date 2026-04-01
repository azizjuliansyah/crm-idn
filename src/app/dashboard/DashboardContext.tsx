'use client';
import React, { createContext, useContext, useEffect } from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { Profile, Company, PlatformSettings, CompanyMember } from '@/lib/types';

interface DashboardContextType {
  user: Profile | null;
  companies: Company[];
  activeCompany: Company | null;
  activeCompanyMembers: CompanyMember[];
  platformSettings: PlatformSettings;
  loading: boolean;
  isLoggingOut: boolean;
  setActiveCompany: (company: Company | null) => void;
  refreshCompanyData: () => Promise<void>;
  logout: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const store = useAppStore();

  const setActiveCompany = (company: Company | null) => {
    store.switchCompany(company);
  };

  const refreshCompanyData = async () => {
    if (store.activeCompany) {
      await store.fetchActiveCompanyMembers(store.activeCompany.id);
    }
  };

  return (
    <DashboardContext.Provider value={{
      user: store.user,
      companies: store.companies,
      activeCompany: store.activeCompany,
      activeCompanyMembers: store.activeCompanyMembers,
      platformSettings: store.platformSettings,
      loading: store.loading,
      isLoggingOut: store.isLoggingOut,
      setActiveCompany,
      refreshCompanyData,
      logout: store.logout
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
