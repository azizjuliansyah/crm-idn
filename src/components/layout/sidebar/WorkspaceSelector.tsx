'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Command, ArrowUpDown, ChevronDown, Monitor, Search, User, LogOut } from 'lucide-react';
import Link from 'next/link';
import { Button, H1, Label, Subtext, Input } from '@/components/ui';
import { Company, PlatformSettings } from '@/lib/types';
import { getPathFromViewId } from '@/lib/navigation';

interface WorkspaceSelectorProps {
  activeCompany: Company | null;
  companies: Company[];
  switchCompany: (company: Company | null) => void;
  platformSettings: PlatformSettings;
  isAdmin: boolean;
  onLogout: () => void;
}

export const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({
  activeCompany,
  companies,
  switchCompany,
  platformSettings,
  isAdmin,
  onLogout
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCompanies = useMemo(() => {
    return companies
      .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.id - b.id);
  }, [companies, searchTerm]);

  return (
    <div className="p-4" ref={dropdownRef}>
      <div className="relative">
        <Button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          variant="ghost-dark"
          align="left" size='sm'
          className={`w-full group flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 border-2 cursor-pointer !normal-case ! ${isDropdownOpen ? 'bg-slate-800 border-slate-600 shadow-none' : (!activeCompany && isAdmin) ? 'bg-gray-900 border-gray-800 hover:border-gray-700' : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-white/5 shadow-none'}`}
        >
          <div className="relative">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-medium text-xs shadow-none transition-transform group-hover:scale-105 duration-300 overflow-hidden ${(!activeCompany && isAdmin) ? 'bg-blue-600' : 'bg-slate-800'}`}>
              {(!activeCompany && isAdmin) ? (
                platformSettings.logo_url ? <img src={platformSettings.logo_url} className="w-full h-full object-cover" alt="Logo" /> : <Command size={20} />
              ) : (
                activeCompany?.logo_url ? <img src={activeCompany.logo_url} className="w-full h-full object-cover" alt="Logo" /> : (activeCompany?.name.charAt(0) || 'C')
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center border-2 border-gray-100 shadow-none">
              <ArrowUpDown size={8} className="text-gray-400" />
            </div>
          </div>
          <div className="flex-1 text-left overflow-hidden">
            <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Workspace</div>
            <div className="text-[13px] font-bold text-white truncate !capitalize">
              {(!activeCompany && isAdmin) ? 'Platform Central' : (activeCompany?.name || 'Pilih Tim')}
            </div>
          </div>
          <ChevronDown size={14} className={`text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </Button>

        {isDropdownOpen && (
          <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-[#081526] border-2 border-slate-600 rounded-2xl shadow-none z-50 py-3 overflow-hidden">
            <div className="max-h-[60vh] flex flex-col">
              {isAdmin && (
                <div className="px-2 pb-2 mb-2 border-b-2 border-slate-800">
                  <Button onClick={() => { switchCompany(null); setIsDropdownOpen(false); }} variant="ghost-dark" align="left" className={`w-full !px-3 !py-2 flex items-center gap-3 rounded-xl transition-all cursor-pointer !normal-case !h-auto ${!activeCompany ? 'bg-blue-600 text-white shadow-none' : 'hover:bg-white/5 text-slate-300'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${!activeCompany ? 'bg-white text-blue-600' : 'bg-slate-800 text-slate-500'}`}><Monitor size={14} /></div>
                    <Label className={`text-[11px] font-semibold !capitalize ! cursor-pointer ${!activeCompany ? 'text-white' : 'text-slate-300'}`}>Platform Central</Label>
                  </Button>
                </div>
              )}
              <div className="px-3 pb-2">
                <div className="relative group/search">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/search:text-blue-400 transition-colors" size={12} />
                  <Input 
                    type="text" 
                    placeholder="Cari tim..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="!w-full !pl-9 !pr-3 !py-2 !bg-slate-950 !border-slate-800 focus:!border-blue-500/50 focus:!bg-slate-900 !rounded-xl !text-[11px] !font-medium !outline-none !transition-all !text-white !h-auto placeholder:text-slate-500" 
                  />
                </div>
              </div>
              <div className="px-2 space-y-1 overflow-y-auto custom-scrollbar">
                {filteredCompanies.map(co => (
                  <Button key={co.id} onClick={() => { switchCompany(co); setIsDropdownOpen(false); }} variant="ghost-dark" align="left" className={`w-full !px-3 !py-2 flex items-center gap-3 rounded-xl transition-all !capitalize !normal-case !h-auto cursor-pointer ${activeCompany?.id === co.id ? 'bg-indigo-600 text-white shadow-none' : 'hover:bg-white/5 text-slate-300'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeCompany?.id === co.id ? 'bg-white text-indigo-600' : 'bg-slate-800 text-slate-500'}`}>{co.logo_url ? <img src={co.logo_url} className="w-full h-full object-cover rounded-lg" alt="Logo" /> : co.name.charAt(0)}</div>
                    <Label className={`text-[11px] truncate !capitalize ! cursor-pointer font-medium ${activeCompany?.id === co.id ? 'text-white' : 'text-slate-300'}`}>{co.name}</Label>
                  </Button>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-800 px-2 space-y-1">
                <Link href={getPathFromViewId('profil_saya')} onClick={() => setIsDropdownOpen(false)} className="w-full px-3 py-2 flex items-center gap-3 rounded-xl text-slate-400 hover:bg-white/5 transition-all cursor-pointer group">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-slate-300 transition-colors"><User size={14} /></div>
                  <Label className="text-[10px] !capitalize ! cursor-pointer">Profil Saya</Label>
                </Link>
                <Button onClick={() => { onLogout(); setIsDropdownOpen(false); }} variant="ghost-dark" align="left" className="w-full !px-3 !py-2 flex items-center gap-3 rounded-xl text-rose-500 hover:bg-rose-400/10 transition-all cursor-pointer !normal-case !h-auto">
                  <div className="w-8 h-8 rounded-lg bg-rose-950/50 flex items-center justify-center text-rose-500"><LogOut size={14} /></div>
                  <Label className="text-[10px] !capitalize ! cursor-pointer">Logout Sesi</Label>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
