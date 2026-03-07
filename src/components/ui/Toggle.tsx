import React from 'react';

interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    className?: string;
    variant?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'blue';
    disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({
    checked,
    onChange,
    className = '',
    variant = 'indigo',
    disabled = false
}) => {
    const variants = {
        indigo: checked ? 'bg-indigo-600' : 'bg-gray-200',
        emerald: checked ? 'bg-emerald-600' : 'bg-gray-200',
        rose: checked ? 'bg-rose-600' : 'bg-gray-200',
        amber: checked ? 'bg-amber-600' : 'bg-gray-200',
        blue: checked ? 'bg-blue-600' : 'bg-gray-200',
    };

    return (
        <div
            onClick={(e) => {
                e.stopPropagation();
                if (!disabled) onChange(!checked);
            }}
            className={`
                relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none mx-auto
                ${variants[variant]}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${className}
            `}
        >
            <span
                aria-hidden="true"
                className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                    ${checked ? 'translate-x-5' : 'translate-x-0'}
                `}
            />
        </div>
    );
};
