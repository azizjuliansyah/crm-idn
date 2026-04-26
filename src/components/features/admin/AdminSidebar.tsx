'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Building2, Users, Settings, Mail, ShieldAlert 
} from 'lucide-react';
import { Card, Label } from '@/components/ui';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard/admin' },
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
        <div className="flex items-center gap-3 text-rose-600 mb-1">
          <ShieldAlert size={20} />
          <Label className="font-bold text-xs tracking-widest uppercase">Admin Central</Label>
        </div>
        <p className="text-[10px] text-gray-400">Pusat Kendali Platform</p>
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
                ? 'bg-white shadow-xl shadow-gray-100 text-gray-900' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50/50'
              }
            `}
          >
            <Icon 
              size={20} 
              className={`transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-blue-600' : ''}`} 
            />
            <span className="font-medium text-sm">{item.label}</span>
            {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />}
          </Link>
        );
      })}
    </Card>
  );
};
