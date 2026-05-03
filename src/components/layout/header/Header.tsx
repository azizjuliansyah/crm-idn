'use client';

import React from 'react';
import { Menu } from 'lucide-react';
import { Button, H2 } from '@/components/ui';

interface HeaderProps {
  isAdmin: boolean;
  activeCompany: any;
  activeView: string;
  setIsSidebarOpen: (open: boolean) => void;
  isSidebarVisible: boolean;
  setIsSidebarVisible: (visible: boolean) => void;
  displayHeader: string;
}

export const Header: React.FC<HeaderProps> = ({
  isAdmin,
  activeCompany,
  activeView,
  setIsSidebarOpen,
  isSidebarVisible,
  setIsSidebarVisible,
  displayHeader
}) => {
  const isHidden = ['buat_penawaran', 'edit_penawaran', 'buat_proforma', 'edit_proforma', 'buat_invoice', 'edit_invoice', 'buat_kwitansi', 'edit_kwitansi', 'buat_request_invoice', 'edit_request_invoice'].includes(activeView);

  return (
    <header className={`sticky top-0 z-10 ${isAdmin && !activeCompany ? 'bg-black/80 border-gray-900' : 'bg-white/80 border-gray-300'} backdrop-blur-md px-6 lg:px-10 h-20 flex items-center border-b-2 ${isHidden ? 'hidden' : ''}`}>
      <Button
        onClick={() => {
          if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            setIsSidebarOpen(true);
          } else {
            setIsSidebarVisible(!isSidebarVisible);
          }
        }}
        variant="ghost"
        size="sm"
        className={`p-2.5 mr-4 transition-all flex items-center justify-center rounded-xl ${isAdmin && !activeCompany ? 'text-gray-400 hover:text-blue-500 hover:bg-gray-900' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'}`}
      >
        <Menu size={20} />
      </Button>
      <H2 className={`text-xl font-medium capitalize truncate ${isAdmin && !activeCompany ? 'text-gray-100' : 'text-gray-900'}`}>{displayHeader}</H2>
    </header>
  );
};
