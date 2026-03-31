import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ActionButtonProps {
    icon: LucideIcon;
    onClick?: (e: React.MouseEvent) => void;
    href?: string;
    prefetch?: boolean;
    variant: 'emerald' | 'blue' | 'rose' | 'indigo' | 'amber' | 'gray';
    title?: string;
    className?: string;
    iconSize?: number;
    disabled?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
    icon: Icon,
    onClick,
    href,
    prefetch = true,
    variant,
    title,
    className = '',
    iconSize = 14,
    disabled = false
}) => {
    const router = useRouter();

    const getVariantStyles = () => {
        if (disabled) return '!text-gray-300 border-gray-100 cursor-not-allowed opacity-50';

        switch (variant) {
            case 'emerald':
                return '!text-emerald-600 hover:!bg-emerald-100 border-emerald-100/50 hover:border-emerald-200/50';
            case 'blue':
                return '!text-blue-600 hover:!bg-blue-100 border-blue-100/50 hover:border-blue-200/50';
            case 'rose':
                return '!text-rose-600 hover:!bg-rose-100 border-rose-100/50 hover:border-rose-200/50';
            case 'indigo':
                return '!text-indigo-600 hover:!bg-indigo-100 border-indigo-100/50 hover:border-indigo-200/50';
            case 'amber':
                return '!text-amber-600 hover:!bg-amber-100 border-amber-100/50 hover:border-amber-200/50';
            case 'gray':
                return '!text-gray-400 hover:!bg-gray-100 border-gray-200 hover:border-gray-300';
            default:
                return '';
        }
    };

    const handlePrefetch = () => {
        if (href && prefetch) {
            router.prefetch(href);
        }
    };

    const content = (
        <Button
            variant="ghost"
            size="sm"
            onClick={disabled ? (e: React.MouseEvent) => e.preventDefault() : onClick}
            title={title}
            disabled={disabled}
            className={`!p-2 border rounded-lg transition-all ${getVariantStyles()} ${className}`}
            onMouseEnter={handlePrefetch}
        >
            <Icon size={iconSize} strokeWidth={variant === 'emerald' ? 2.5 : 2} />
        </Button>
    );

    if (href && !disabled) {
        return (
            <Link href={href} prefetch={prefetch} onClick={(e) => e.stopPropagation()}>
                {content}
            </Link>
        );
    }

    return content;
};
