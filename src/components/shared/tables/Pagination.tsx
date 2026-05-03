'use client';

import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Input, 
  ComboBox,
  Subtext
} from '@/components/ui';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Hash
} from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  className = ''
}) => {
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const [jumpValue, setJumpValue] = useState(String(currentPage));

  useEffect(() => {
    setJumpValue(String(currentPage));
  }, [currentPage]);

  const handleJump = () => {
    const page = parseInt(jumpValue);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
    } else {
      setJumpValue(String(currentPage));
    }
  };

  const pageSizeOptions = [
    { value: 20, label: '20 Baris' },
    { value: 50, label: '50 Baris' },
    { value: 100, label: '100 Baris' },
    { value: 500, label: '500 Baris' },
    { value: 1000, label: '1000 Baris' },
    { value: 10000, label: '10000 Baris' },
  ];

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const showMax = 5;
    
    if (totalPages <= showMax) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + 4);
      
      if (end === totalPages) {
        start = Math.max(1, end - 4);
      }
      
      for (let i = start; i <= end; i++) pages.push(i);
    }
    return pages;
  };

  const startEntry = (currentPage - 1) * pageSize + 1;
  const endEntry = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className={`flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-4 bg-gray-50/50 border-t border-gray-100 ${className}`}>
      {/* Entries Info */}
      <div className="flex items-center gap-3">
        <Subtext className="text-[10px] uppercase font-bold text-gray-400 tracking-wider whitespace-nowrap">
          Menampilkan <span className="text-gray-900">{totalCount > 0 ? startEntry : 0}-{endEntry}</span> dari <span className="text-gray-900">{totalCount}</span> Data
        </Subtext>
        
        <div className="h-4 w-[1px] bg-gray-200 mx-2 hidden md:block" />
        
        <div className="flex items-center gap-2">
          <Subtext className="text-[10px] uppercase font-bold text-gray-400 whitespace-nowrap mr-1">Baris:</Subtext>
          <ComboBox
            options={pageSizeOptions}
            value={pageSize}
            onChange={(val) => onPageSizeChange(Number(val))}
            size="sm"
            hideSearch
            triggerClassName="!py-1.5 !px-3 !bg-white !border-gray-200 !text-[10px] !font-bold !w-32"
          />
        </div>
      </div>

      {/* Page Navigation */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="!p-2 min-w-0"
        >
          <ChevronsLeft size={14} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="!p-2 min-w-0"
        >
          <ChevronLeft size={14} />
        </Button>

        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map(p => (
            <Button
              key={p}
              variant={currentPage === p ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onPageChange(p)}
              className={`min-w-[32px] !h-8 !p-0 font-bold ${currentPage === p ? 'border-2 border-blue-500 bg-blue-50 text-blue-600' : ''}`}
            >
              {p}
            </Button>
          ))}
          {totalPages > 5 && getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
            <span className="text-gray-400 px-1">...</span>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="!p-2 min-w-0"
        >
          <ChevronRight size={14} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="!p-2 min-w-0"
        >
          <ChevronsRight size={14} />
        </Button>
      </div>

      {/* Jump to Page */}
      <div className="flex items-center gap-2">
        <Subtext className="text-[10px] uppercase font-bold text-gray-400 whitespace-nowrap">Loncat ke:</Subtext>
        <div className="relative group">
          <Input
            value={jumpValue}
            onChange={(e) => setJumpValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJump()}
            onBlur={handleJump}
            className="!py-1.5 !px-3 !pl-8 !h-8 !w-20 !text-[10px] !font-bold !bg-white group-hover:border-blue-400 transition-all border-gray-200"
            containerClassName="!space-y-0"
          />
          <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300 group-hover:text-blue-400 transition-colors" size={12} />
        </div>
      </div>
    </div>
  );
};
