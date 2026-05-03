'use client';

import React from 'react';
import Link from 'next/link';
import { User, LogOut } from 'lucide-react';
import { Button, Subtext } from '@/components/ui';
import { Profile } from '@/lib/types';
import { getPathFromViewId } from '@/lib/navigation';

interface SidebarFooterProps {
  user: Profile;
  currentRoleName: string;
  onLogout: () => void;
  setIsSidebarOpen: (open: boolean) => void;
  isAdmin?: boolean;
  activeCompany?: any;
}

export const SidebarFooter: React.FC<SidebarFooterProps> = ({
  user,
  currentRoleName,
  onLogout,
  setIsSidebarOpen,
  isAdmin,
  activeCompany
}) => {
  return (
    <div className={`p-4 border-t border-slate-800 flex items-center justify-between gap-2 ${isAdmin && !activeCompany ? 'bg-black' : 'bg-[#081526]/50'}`}>
      <Link 
        href={getPathFromViewId('profil_saya')} 
        className="flex-1 flex items-center gap-3 overflow-hidden p-2 rounded-xl text-left cursor-pointer hover:bg-white/5 transition-all border border-transparent hover:border-slate-700 group" 
        onClick={() => setIsSidebarOpen(false)}
      >
        <div className="w-10 h-10 rounded-xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-500 overflow-hidden shrink-0 shadow-none group-hover:border-blue-500/50 transition-colors">
          {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" alt="Avatar" /> : <User size={20} />}
        </div>
        <div className="overflow-hidden">
          <Subtext className="text-[11px] font-semibold text-gray-100 truncate ">{user.full_name}</Subtext>
          <Subtext className="text-[9px] text-gray-500 font-medium !capitalize ! truncate">{currentRoleName}</Subtext>
        </div>
      </Link>
      <Button 
        onClick={onLogout} 
        variant="ghost-dark" 
        className="p-2.5 text-gray-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all cursor-pointer" 
        title="Keluar Sesi"
      >
        <LogOut size={16} />
      </Button>
    </div>
  );
};
