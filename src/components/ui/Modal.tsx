
import React, { useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';
import { H1, H3 } from './Typography';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  noPadding?: boolean;
  noScroll?: boolean;
  hideClose?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  noPadding = false,
  noScroll = false,
  hideClose = false
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={`w-full ${sizeClasses[size]} bg-white rounded-2xl shadow-2xl shadow-gray-900/10 overflow-hidden transform`}
      >
        {!hideClose && (
          <div className={`px-8 pt-8 pb-4 flex items-center justify-between border-b border-gray-50 ${title === '' ? 'absolute top-0 right-0 z-50 border-none bg-transparent' : ''}`}>
            {title !== '' && <H1 className="text-xl  text-gray-900 tracking-tight">{title}</H1>}
            <button
              onClick={onClose}
              className={`p-2 rounded-full transition-all cursor-pointer ${title === '' ? 'text-gray-400 hover:text-gray-900 bg-white/50 backdrop-blur-sm' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              <X size={20} />
            </button>
          </div>
        )}

        <div className={`${noPadding ? 'p-0' : 'px-8 py-6'} ${noScroll ? 'overflow-visible' : 'max-h-[70vh] overflow-y-auto custom-scrollbar'}`}>
          {children}
        </div>

        {footer && (
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// Internal sub-component for Dynamic Permissions List
export const PermissionsList: React.FC<{
  available: string[];
  selected: string[];
  onToggle: (perm: string) => void;
}> = ({ available, selected, onToggle }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
      {available.map(perm => {
        const isSelected = selected.includes(perm);
        return (
          <button
            key={perm}
            onClick={() => onToggle(perm)}
            type="button"
            className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${isSelected
                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
              }`}
          >
            <span className="text-xs  uppercase tracking-tight">{perm}</span>
            <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-50 border-gray-200'
              }`}>
              {isSelected && <Check size={12} strokeWidth={4} />}
            </div>
          </button>
        );
      })}
    </div>
  );
};
