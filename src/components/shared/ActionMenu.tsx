'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui';

interface ActionMenuProps {
  children: React.ReactNode;
  triggerClassName?: string;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({ children, triggerClassName = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.right - 192,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={triggerRef}>
      <Button
        variant="ghost"
        size="sm"
        className={`p-2 text-gray-400 hover:text-gray-600 transition-none ${triggerClassName}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <MoreVertical size={16} />
      </Button>

      {isOpen && (
        <div 
          ref={menuRef}
          className="fixed bg-white border-2 border-gray-300 rounded-lg shadow-xl z-[9999] py-1 w-48 origin-top-right transition-none"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
        >
          <div onClick={() => setIsOpen(false)}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
};
