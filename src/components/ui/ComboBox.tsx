import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Plus, X, Check, Loader2 } from 'lucide-react';

interface ComboBoxOption {
  value: string | number;
  label: string;
  sublabel?: string;
  [key: string]: any;
}

interface ComboBoxProps {
  options: ComboBoxOption[];
  value?: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  onAddNew?: () => void;
  addNewLabel?: string;
  hideSearch?: boolean;
  className?: string;
  disabled?: boolean;
  placeholderSize?: string;
  size?: 'sm' | 'md' | 'lg';
  triggerClassName?: string;
  // New props for infinite scroll and server-side search
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onSearchChange?: (term: string) => void;
}

export const ComboBox: React.FC<ComboBoxProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Pilih item...',
  label,
  error,
  leftIcon,
  onAddNew,
  addNewLabel = 'Tambah Baru',
  hideSearch = false,
  className = '',
  disabled = false,
  placeholderSize = 'text-sm',
  size = 'md',
  triggerClassName = '',
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  onSearchChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, placement: 'bottom' as 'top' | 'bottom' });

  const selectedOption = useMemo(() =>
    options.find(opt => opt.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    // If we have a server-side search handler, we don't filter client-side
    if (onSearchChange) return options;
    
    if (hideSearch || !searchTerm) return options;
    return options.filter(opt =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [options, searchTerm, hideSearch, onSearchChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleScroll = (event: Event) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true); // true to catch scroll on any element

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (hideSearch) {
        setSearchTerm('');
      }
    }
  }, [isOpen, hideSearch]);

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (onSearchChange) {
      onSearchChange(term);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="text-[10px] font-medium text-gray-400 uppercase  ml-1">
          {label}
        </label>
      )}

      <div
        onClick={(e) => {
          if (!disabled) {
            if (!isOpen && containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              const viewportHeight = window.innerHeight;
              const dropdownHeight = 350; // Max estimated height
              const spaceBelow = viewportHeight - rect.bottom;
              const spaceAbove = rect.top;

              let placement: 'top' | 'bottom' = 'bottom';
              if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
                placement = 'top';
              }

              setDropdownPosition({
                top: placement === 'bottom' ? rect.bottom + 4 : rect.top - 4,
                left: rect.left,
                width: rect.width,
                placement
              });
            }
            setIsOpen(!isOpen);
          }
        }}
        className={`
          flex items-center ${size === 'sm' ? 'gap-2 px-3 py-2' : 'gap-3 px-5 py-3.5'} bg-white border rounded-md transition-all cursor-pointer
          ${isOpen ? 'border-blue-500 ring-4 ring-blue-50/50' : 'border-gray-200 hover:border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}
          ${error ? 'border-rose-300 ring-rose-50/50' : ''}
          ${triggerClassName}
        `}
      >
        {leftIcon && <div className="text-gray-300">{leftIcon}</div>}

        <div className="flex-1 overflow-hidden">
          {selectedOption ? (
            <div className="flex flex-col min-w-0">
              <span className={`font-medium text-gray-900 truncate block normal-case ${placeholderSize}`}>{selectedOption.label}</span>
              {selectedOption.sublabel && (
                <span className="text-[10px] text-gray-400 uppercase  truncate block">{selectedOption.sublabel}</span>
              )}
            </div>
          ) : (
            <span className={`text-gray-400 font-medium normal-case truncate block whitespace-nowrap ${placeholderSize}`}>{placeholder}</span>
          )}
        </div>

        <ChevronDown
          size={16}
          className={`text-gray-300 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-500' : ''}`}
        />
      </div>

      {isOpen && (
        <div
          className={`fixed bg-white border border-gray-100 rounded-md shadow-2xl z-[9999] py-3 animate-in fade-in zoom-in-95 duration-200 ${dropdownPosition.placement === 'top' ? 'origin-bottom' : 'origin-top'
            }`}
          style={{
            top: dropdownPosition.placement === 'top' ? 'auto' : `${dropdownPosition.top}px`,
            bottom: dropdownPosition.placement === 'top' ? `${window.innerHeight - dropdownPosition.top}px` : 'auto',
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            maxHeight: '350px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {!hideSearch && (
            <div className="px-3 pb-2 border-b border-gray-50 mb-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Cari..."
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border-none rounded-md text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                  autoFocus
                />
              </div>
            </div>
          )}

          <div className="max-h-[250px] overflow-y-auto custom-scrollbar px-2 space-y-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`
                    w-full px-4 py-3 rounded-md flex items-center justify-between cursor-pointer transition-all
                    ${opt.value === value ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-700'}
                  `}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold">{opt.label}</span>
                    {opt.sublabel && (
                      <span className="text-[9px] uppercase  text-gray-400 truncate">{opt.sublabel}</span>
                    )}
                  </div>
                  {opt.value === value && <Check size={14} className="text-blue-600 shrink-0" />}
                </div>
              ))
            ) : (
              <div className="py-8 text-center bg-gray-50/50 rounded-md mx-2 border border-dashed border-gray-100">
                <span className="text-xs text-gray-400">Tidak ada hasil ditemukan</span>
              </div>
            )}

            {hasMore && (
              <ComboBoxSentinel 
                onIntersect={() => onLoadMore?.()}
                enabled={isOpen}
                isLoading={isLoadingMore}
              />
            )}
          </div>

          {onAddNew && (
            <div className="mt-2 pt-2 border-t border-gray-50 px-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddNew();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-blue-600 font-bold text-[10px] uppercase  hover:bg-blue-50 transition-all text-left"
              >
                <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
                  <Plus size={12} />
                </div>
                {addNewLabel}
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-[9px] text-rose-500 uppercase ml-1 mt-1">{error}</p>}
    </div>
  );
};

const ComboBoxSentinel: React.FC<{
  onIntersect: () => void;
  enabled: boolean;
  isLoading?: boolean;
}> = ({ onIntersect, enabled, isLoading }) => {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          onIntersect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [enabled, onIntersect, isLoading]);

  if (!enabled) return null;

  return (
    <div ref={sentinelRef} className="py-4 text-center">
      {isLoading && (
        <Loader2 className="animate-spin text-blue-500 mx-auto" size={16} />
      )}
    </div>
  );
};
