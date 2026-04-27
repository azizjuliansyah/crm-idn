'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Building2, Users, Settings, Mail, ShieldAlert, Package
} from 'lucide-react';
import { Card, Label } from '@/components/ui';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard/admin' },
  { id: 'data_paket', label: 'Data Paket', icon: Package, href: '/dashboard/admin/packages' },
  { id: 'perusahaan', label: 'Workspace', icon: Building2, href: '/dashboard/admin/companies' },
  { id: 'pengguna', label: 'Pengguna', icon: Users, href: '/dashboard/admin/users' },
  { id: 'pengaturan', label: 'Platform', icon: Settings, href: '/dashboard/admin/platform' },
  { id: 'pengaturan_email', label: 'Mailketing', icon: Mail, href: '/dashboard/admin/email' },
];

export const AdminSidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <Card contentClassName="p-4 flex flex-col gap-2 border-0 bg-transparent shadow-none">
      <div className="px-4 py-3 mb-4">
        <div className="flex items-center gap-3 text-rose-500 mb-1">
          <ShieldAlert size={20} />
          <Label className="font-bold text-xs tracking-widest uppercase text-gray-100">Admin Central</Label>
        </div>
        <p className="text-[10px] text-gray-500">Pusat Kendali Platform</p>
      </div>

      {menuItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.id}
            href={item.href}
            className={`
              flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group
              ${isActive
                ? 'bg-blue-400/10 shadow-lg shadow-blue-900/10 text-blue-400 font-bold'
                : 'text-gray-400 hover:text-gray-100 hover:bg-white/5 hover:translate-x-1 font-medium'
              }
            `}
          >
            <Icon
              size={20}
              className={`transition-all duration-300 group-hover:scale-110 ${isActive ? 'text-blue-400' : ''}`}
            />
            <span className="text-sm">{item.label}</span>
            {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]" />}
          </Link>
        );
      })}
    </Card>
  );
};
