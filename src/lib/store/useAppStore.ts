import { create } from 'zustand';
import { Company, Profile, CompanyMember, PlatformSettings, ChatMessage } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface AppState {
  user: Profile | null;
  companies: Company[];
  activeCompany: Company | null;
  activeCompanyMembers: CompanyMember[];
  platformSettings: PlatformSettings;
  loading: boolean;
  isLoggingOut: boolean;
  toast: {
    isOpen: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  };
  kbChatMessages: ChatMessage[];
  
  // Basic Actions
  setUser: (user: Profile | null) => void;
  setCompanies: (companies: Company[]) => void;
  setActiveCompany: (company: Company | null) => void;
  setActiveCompanyMembers: (members: CompanyMember[]) => void;
  setPlatformSettings: (settings: PlatformSettings) => void;
  setLoading: (loading: boolean) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
  setKbChatMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  
  // Complex Actions
  init: () => Promise<void>;
  logout: () => Promise<void>;
  switchCompany: (company: Company | null) => void;
  fetchActiveCompanyMembers: (companyId: number) => Promise<void>;
  fetchCompanies: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  companies: [],
  activeCompany: null,
  activeCompanyMembers: [],
  platformSettings: { name: 'CRM Platform', is_singleton: false },
  loading: true,
  isLoggingOut: false,
  toast: {
    isOpen: false,
    message: '',
    type: 'success',
  },
  kbChatMessages: [],

  setUser: (user) => set({ user }),
  setCompanies: (companies) => set({ companies }),
  setActiveCompany: (company) => set({ activeCompany: company }),
  setActiveCompanyMembers: (activeCompanyMembers) => set({ activeCompanyMembers }),
  setPlatformSettings: (platformSettings) => set({ platformSettings }),
  setLoading: (loading) => set({ loading }),
  
  showToast: (message, type = 'success') => set({ 
    toast: { 
      isOpen: true, 
      message, 
      type 
    } 
  }),
  
  hideToast: () => set((state) => ({ 
    toast: { 
      ...state.toast, 
      isOpen: false 
    } 
  })),
  setKbChatMessages: (messages) => set((state) => ({ 
    kbChatMessages: typeof messages === 'function' ? messages(state.kbChatMessages) : messages 
  })),

  init: async () => {
    const { user, loading } = get();
    // Only show global loading on initial fetch (when no user is present)
    if (!user && !loading) set({ loading: true });

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        set({ loading: false });
        return;
      }

      // Parallelize fetches
      const [profileRes, settingsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', authUser.id).single(),
        supabase.from('platform_settings').select('*').single()
      ]);

      if (profileRes.data) {
        set({ user: profileRes.data });
        await get().fetchCompanies();
      }

      if (settingsRes.data) {
        set({ platformSettings: settingsRes.data });
      }

    } catch (error) {
      console.error('App Store init failed:', error);
    } finally {
      set({ loading: false });
    }
  },

  switchCompany: (company) => {
    set({ activeCompany: company });
    if (company) {
      localStorage.setItem('crm_active_company_id', String(company.id));
      document.cookie = `crm_active_company_id=${company.id}; path=/; max-age=31536000`;
      get().fetchActiveCompanyMembers(company.id);
    } else {
      localStorage.removeItem('crm_active_company_id');
      document.cookie = 'crm_active_company_id=; path=/; max-age=0';
      set({ activeCompanyMembers: [] });
    }
  },

  fetchActiveCompanyMembers: async (companyId: number) => {
    const { data } = await supabase
      .from('company_members')
      .select('*, profile:profiles(*), company_roles(*)')
      .eq('company_id', companyId);
    if (data) {
      set({ activeCompanyMembers: data });
    }
  },

  fetchCompanies: async () => {
    const { user } = get();
    if (!user) return;

    try {
      let fetchedCompanies: Company[] = [];
      if (user.platform_role === 'ADMIN') {
        const { data } = await supabase.from('companies').select('*');
        if (data) fetchedCompanies = data;
      } else {
        const { data: memberCompanies } = await supabase
          .from('company_members')
          .select('company:companies(*)')
          .eq('user_id', user.id);
        if (memberCompanies) {
          fetchedCompanies = memberCompanies.map((mc: any) => mc.company);
        }
      }
      set({ companies: fetchedCompanies });

      // If we have an active company, ensure it's updated in the state if it's in the new list
      const { activeCompany } = get();
      if (activeCompany) {
        const updatedActive = fetchedCompanies.find(c => c.id === activeCompany.id);
        if (updatedActive) {
          set({ activeCompany: updatedActive });
        }
      } else {
        // Initial set of active company if none active
        const savedId = localStorage.getItem('crm_active_company_id');
        const found = fetchedCompanies.find(c => String(c.id) === savedId);
        
        if (found) {
          get().switchCompany(found);
        } else if (user.platform_role !== 'ADMIN' && fetchedCompanies.length > 0) {
          get().switchCompany(fetchedCompanies[0]);
        }
      }
    } catch (error) {
      console.error('Fetch companies failed:', error);
    }
  },

  logout: async () => {
    set({ isLoggingOut: true });
    localStorage.removeItem('crm_active_company_id');
    document.cookie = 'crm_active_company_id=; path=/; max-age=0';
    set({ activeCompany: null, user: null, companies: [], activeCompanyMembers: [], kbChatMessages: [] });
    await supabase.auth.signOut();
    set({ isLoggingOut: false });
    window.location.replace('/login');
  },
}));
