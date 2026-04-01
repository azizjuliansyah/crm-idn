'use client';
import React from 'react';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  const router = useRouter();

  return (
    <nav className={`flex items-center gap-2 text-sm ${className}`}>
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <div className="flex items-center gap-2">
            {item.href && !item.active ? (
              <Link
                href={item.href}
                className="font-medium text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                onMouseEnter={() => router.prefetch(item.href!)}
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={`font-medium ${item.active ? 'text-gray-900 ' : 'text-gray-400'}`}
              >
                {item.label}
              </span>
            )}
          </div>
          {idx < items.length - 1 && (
            <ChevronRight size={14} className="text-gray-300" />
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
