'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
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

interface DashboardProviderProps {
  children: React.ReactNode;
  initialData?: {
    user: Profile | null;
    companies: Company[];
    platformSettings: PlatformSettings;
  };
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children, initialData }: DashboardProviderProps) {
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(initialData?.user || null);
  const [companies, setCompanies] = useState<Company[]>(initialData?.companies || []);
  const [activeCompany, setActiveCompanyState] = useState<Company | null>(null);
  const [activeCompanyMembers, setActiveCompanyMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(!initialData);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(
    initialData?.platformSettings || { name: 'CRM Platform', is_singleton: false }
  );

  // Wrapper for setActiveCompany to also persist to localStorage and handle routing
  const setActiveCompany = (company: Company | null) => {
    // Only redirect if changing to a completely different company after initial load
    const isExplicitChange = activeCompany && company && activeCompany.id !== company.id;

    setActiveCompanyState(company);
    if (company) {
      localStorage.setItem('crm_active_company_id', String(company.id));
      if (isExplicitChange) {
        if (window.location.pathname !== '/dashboard' && !window.location.pathname.startsWith('/dashboard/settings/profile')) {
          router.push('/dashboard');
        }
      }
    } else {
      localStorage.removeItem('crm_active_company_id');
      if (activeCompany) {
        router.push('/dashboard');
      }
    }
  };

  useEffect(() => {
    if (!initialData) {
      checkSession();
    }
  }, [initialData]);

  // Set initial active company if none selected (Regular users only)
  useEffect(() => {
    if (!activeCompany && companies.length > 0) {
      // First try to restore from localStorage
      const savedCompanyId = localStorage.getItem('crm_active_company_id');
      if (savedCompanyId) {
        const savedCompany = companies.find(c => String(c.id) === savedCompanyId);
        if (savedCompany) {
          setActiveCompany(savedCompany);
          return;
        }
      }

      // If not restorative and user is not admin, default to first company
      if (user?.platform_role !== 'ADMIN') {
        setActiveCompany(companies[0]);
      }
    }
  }, [companies, user]);

  const checkSession = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login');
        return;
      }

      // Parallelize Profile, Settings, and Companies fetching
      const [profileRes, settingsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', authUser.id).single(),
        supabase.from('platform_settings').select('*').single()
      ]);

      const profile = profileRes.data;
      if (!profile) {
        console.error("No profile found");
        router.push('/login');
        return;
      }
      setUser(profile);

      if (settingsRes.data) {
        setPlatformSettings(settingsRes.data);
      }

      // Fetch Companies based on role
      if (profile.platform_role === 'ADMIN') {
        const { data: allCompanies } = await supabase.from('companies').select('*');
        if (allCompanies) setCompanies(allCompanies);
      } else {
        const { data: memberCompanies } = await supabase
          .from('company_members')
          .select('company:companies(*)')
          .eq('user_id', authUser.id);

        if (memberCompanies) {
          setCompanies(memberCompanies.map((mc: any) => mc.company));
        }
      }

    } catch (error) {
      console.error('Session check failed:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setIsLoggingOut(true);
    localStorage.removeItem('crm_active_company_id');
    setActiveCompanyState(null);
    await supabase.auth.signOut();
    router.push('/login');
  };

  const refreshCompanyData = async () => {
    // This can be used to re-fetch company specific data if needed, 
    // but mostly activeCompany state change triggers downstream effects.
  };

  // Fetch members when active company changes
  useEffect(() => {
    if (activeCompany) {
      const fetchMembers = async () => {
        const { data } = await supabase
          .from('company_members')
          .select('*, profile:profiles(*)')
          .eq('company_id', activeCompany.id);
        if (data) setActiveCompanyMembers(data);
      };
      fetchMembers();
    } else {
      setActiveCompanyMembers([]);
    }
  }, [activeCompany]);

  return (
    <DashboardContext.Provider value={{
      user,
      companies,
      activeCompany,
      activeCompanyMembers,
      platformSettings,
      loading,
      isLoggingOut,
      setActiveCompany,
      refreshCompanyData,
      logout
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
