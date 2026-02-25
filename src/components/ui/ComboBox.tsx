import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Plus, X, Check } from 'lucide-react';

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
  className?: string;
  disabled?: boolean;
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
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(() =>
    options.find(opt => opt.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(opt =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [options, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) setSearchTerm('');
  }, [isOpen]);

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`space-y-2 w-full relative ${className}`} ref={containerRef}>
      {label && (
        <label className="text-[10px] font-medium text-gray-400 uppercase tracking-tight ml-1">
          {label}
        </label>
      )}

      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          flex items-center gap-3 px-5 py-3.5 bg-white border rounded-md transition-all cursor-pointer
          ${isOpen ? 'border-blue-500 ring-4 ring-blue-50/50' : 'border-gray-200 hover:border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}
          ${error ? 'border-rose-300 ring-rose-50/50' : ''}
        `}
      >
        {leftIcon && <div className="text-gray-300">{leftIcon}</div>}

        <div className="flex-1 overflow-hidden">
          {selectedOption ? (
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900 truncate">{selectedOption.label}</span>
              {selectedOption.sublabel && (
                <span className="text-[10px] text-gray-400 uppercase tracking-tight truncate">{selectedOption.sublabel}</span>
              )}
            </div>
          ) : (
            <span className="text-sm text-gray-400">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          size={16}
          className={`text-gray-300 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-500' : ''}`}
        />
      </div>

      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-gray-100 rounded-md shadow-2xl z-[100] py-3 animate-in fade-in zoom-in duration-200 origin-top">
          <div className="px-3 pb-2 border-b border-gray-50 mb-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari..."
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border-none rounded-md text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                autoFocus
              />
            </div>
          </div>

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
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-semibold truncate">{opt.label}</span>
                    {opt.sublabel && (
                      <span className="text-[9px] uppercase tracking-tight text-gray-400 truncate">{opt.sublabel}</span>
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
          </div>

          {onAddNew && (
            <div className="mt-2 pt-2 border-t border-gray-50 px-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddNew();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-blue-600 font-bold text-[10px] uppercase tracking-tight hover:bg-blue-50 transition-all text-left"
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
