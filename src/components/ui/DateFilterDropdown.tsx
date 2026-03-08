'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Calendar } from 'lucide-react';
import { Input } from './Input';
import { Label } from './Typography';

interface DateFilterDropdownProps {
    value: string;
    onChange: (value: string) => void;
    startDate: string;
    endDate: string;
    onStartDateChange: (value: string) => void;
    onEndDateChange: (value: string) => void;
    className?: string;
    hideAllOption?: boolean;
}

export const DateFilterDropdown: React.FC<DateFilterDropdownProps> = ({
    value,
    onChange,
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    className = '',
    hideAllOption = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const options = useMemo(() => {
        const baseOptions = [
            { label: 'Semua Tanggal', value: 'all' },
            { label: '1 Hari Yang Lalu', value: '1' },
            { label: '7 Hari Yang Lalu', value: '7' },
            { label: '14 Hari Yang Lalu', value: '14' },
            { label: '30 Hari Yang Lalu', value: '30' },
            { label: '60 Hari Yang Lalu', value: '60' },
            { label: 'Custom Tanggal', value: 'custom' }
        ];
        return hideAllOption ? baseOptions.filter(o => o.value !== 'all') : baseOptions;
    }, [hideAllOption]);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDisplayLabel = () => {
        if (value === 'custom') {
            if (startDate && endDate) return `${new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${new Date(endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`;
            return 'Custom Tanggal';
        }
        return selectedOption?.label || 'Pilih Tanggal';
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    setIsOpen(!isOpen);
                }}
                className={`
          flex items-center gap-3 px-5 py-3.5 bg-white border rounded-md transition-all
          ${isOpen ? 'border-blue-500 ring-4 ring-blue-50/50' : 'border-gray-200 hover:border-gray-300'}
        `}
            >
                <Calendar size={14} className="text-gray-300 shrink-0" />
                <span className="text-[10px] font-medium text-gray-900 uppercase  whitespace-nowrap">
                    {handleDisplayLabel()}
                </span>
                <ChevronDown size={14} className={`text-gray-300 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-[calc(100%+8px)] right-0 w-[280px] bg-white border border-gray-100 rounded-xl shadow-xl z-[100] py-3 animate-in fade-in zoom-in duration-200 origin-top-right">
                    <div className="px-3 pb-2 border-b border-gray-50 mb-2">
                        <span className="text-[10px] font-medium text-gray-900 uppercase  ml-1">Filter Tanggal</span>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto px-2 space-y-1">
                        {options.map((opt) => (
                            <label
                                key={opt.value}
                                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all
                  ${opt.value === value ? 'bg-blue-50/50' : 'hover:bg-gray-50'}
                `}
                            >
                                <input
                                    type="radio"
                                    name="date-filter-radio"
                                    value={opt.value}
                                    checked={value === opt.value}
                                    onChange={() => onChange(opt.value)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 rounded-full"
                                />
                                <span className={`text-sm ${opt.value === value ? 'font-medium text-blue-700' : 'text-gray-700'}`}>
                                    {opt.label}
                                </span>
                            </label>
                        ))}
                    </div>

                    {(value === 'custom') && (
                        <div className="mt-3 mx-4 pt-3 border-t border-gray-100 space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-medium text-gray-400 uppercase ">Mulai Tanggal</label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => onStartDateChange(e.target.value)}
                                    className="!py-2 text-xs"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-medium text-gray-400 uppercase ">Sampai Tanggal</label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => onEndDateChange(e.target.value)}
                                    className="!py-2 text-xs"
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
