import React from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    className?: string;
    variant?: 'primary' | 'emerald' | 'blue' | 'indigo';
}

export const Checkbox: React.FC<CheckboxProps> = ({
    checked,
    onChange,
    className = '',
    variant = 'primary'
}) => {
    const variants = {
        primary: 'bg-blue-600 border-blue-600',
        emerald: 'bg-emerald-600 border-emerald-600',
        blue: 'bg-blue-600 border-blue-600',
        indigo: 'bg-indigo-600 border-indigo-600'
    };

    return (
        <div
            onClick={(e) => {
                e.stopPropagation();
                onChange(!checked);
            }}
            className={`
        w-5 h-5 rounded-md flex items-center justify-center border transition-all cursor-pointer mx-auto
        ${checked ? variants[variant] + ' text-white scale-105 shadow-sm' : 'bg-white border-gray-200 text-transparent hover:border-gray-300'}
        ${className}
      `}
        >
            <Check size={12} strokeWidth={4} className={`transition-transform duration-200 ${checked ? 'scale-100' : 'scale-0'}`} />
        </div>
    );
};
