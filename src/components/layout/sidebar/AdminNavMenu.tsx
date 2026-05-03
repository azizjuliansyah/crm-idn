'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Building2, Users, Settings, Mail, Package, ShieldAlert 
} from 'lucide-react';
import { Label } from '@/components/ui';

interface AdminNavMenuProps {
  setIsSidebarOpen: (open: boolean) => void;
}

export const AdminNavMenu: React.FC<AdminNavMenuProps> = ({ setIsSidebarOpen }) => {
  const pathname = usePathname();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard />, href: '/dashboard/admin', color: 'bg-blue-500' },
    { id: 'data_paket', label: 'Data Paket', icon: <Package />, href: '/dashboard/admin/packages', color: 'bg-rose-500' },
    { id: 'perusahaan', label: 'Workspace', icon: <Building2 />, href: '/dashboard/admin/companies', color: 'bg-indigo-500' },
    { id: 'pengguna', label: 'Pengguna', icon: <Users />, href: '/dashboard/admin/users', color: 'bg-emerald-500' },
    { id: 'pengaturan', label: 'Platform', icon: <Settings />, href: '/dashboard/admin/platform', color: 'bg-amber-500' },
    { id: 'pengaturan_email', label: 'Mailketing', icon: <Mail />, href: '/dashboard/admin/email', color: 'bg-sky-500' },
  ];

  const renderMenuItem = (label: string, icon: React.ReactNode, href: string, bgColorClass: string) => {
    const isActive = href === '/dashboard/admin' ? pathname === href : pathname.startsWith(href);

    return (
      <div className="relative group" key={href}>
        {isActive && (
          <div className="absolute left-[-12px] top-2 bottom-2 w-1 bg-blue-600 rounded-r-full shadow-none z-10" />
        )}
        <Link
          href={href}
          onClick={() => setIsSidebarOpen(false)}
          className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all duration-300 cursor-pointer group/item ${isActive ? 'text-blue-400 bg-blue-400/10 font-bold' : 'text-gray-400 hover:text-gray-100 hover:bg-white/5 hover:translate-x-1 font-medium'}`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 shadow-none ${isActive ? 'bg-blue-600 text-white' : `${bgColorClass} text-white group-hover/item:scale-110`}`}>
            {React.cloneElement(icon as React.ReactElement<any>, { size: 14 })}
          </div>
          <Label className={`text-[13px] !capitalize ! cursor-pointer transition-colors duration-300 ${isActive ? 'text-blue-400' : 'text-inherit group-hover/item:text-gray-100'}`}>{label}</Label>
        </Link>
      </div>
    );
  };

  return (
    <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto">
      
      {menuItems.map(item => renderMenuItem(item.label, item.icon, item.href, item.color))}
    </nav>
  );
};
