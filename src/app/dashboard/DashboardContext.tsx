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
  setActiveCompany: (company: Company | null) => void;
  refreshCompanyData: () => Promise<void>;
  logout: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [activeCompanyMembers, setActiveCompanyMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({ name: 'CRM Platform', is_singleton: false });

  useEffect(() => {
    checkSession();
  }, []);

  // Set initial active company if none selected
  useEffect(() => {
    if (!activeCompany && companies.length > 0) {
      setActiveCompany(companies[0]);
    }
  }, [companies]);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Fetch Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (!profile) {
        console.error("No profile found");
        return;
      }
      setUser(profile);

      // Fetch Platform Settings
      const { data: settings } = await supabase.from('platform_settings').select('*').single();
      if (settings) setPlatformSettings(settings);

      // Fetch Companies associated with user
      if (profile.platform_role === 'ADMIN') {
        const { data: allCompanies } = await supabase.from('companies').select('*');
        if (allCompanies) setCompanies(allCompanies);
      } else {
        const { data: memberCompanies } = await supabase
            .from('company_members')
            .select('company:companies(*)')
            .eq('user_id', session.user.id);
        
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
