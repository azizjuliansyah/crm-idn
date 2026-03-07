import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    type?: ToastType;
    isOpen: boolean;
    onClose: () => void;
    duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
    message,
    type = 'success',
    isOpen,
    onClose,
    duration = 3000,
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            const animTimer = setTimeout(() => setIsVisible(true), 10);
            const timer = setTimeout(() => {
                handleClose();
            }, duration);
            return () => {
                clearTimeout(animTimer);
                clearTimeout(timer);
            };
        } else {
            setIsVisible(false);
        }
    }, [isOpen, duration]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            setShouldRender(false);
            onClose();
        }, 300);
    };

    if (!shouldRender || typeof document === 'undefined') return null;

    const variants = {
        success: {
            bg: 'bg-emerald-50/95',
            border: 'border-emerald-200/50',
            accent: 'bg-emerald-500',
            text: 'text-emerald-700',
            icon: <CheckCircle2 size={18} className="text-emerald-600" />,
            glow: 'shadow-emerald-500/10'
        },
        error: {
            bg: 'bg-rose-50/95',
            border: 'border-rose-200/50',
            accent: 'bg-rose-500',
            text: 'text-rose-700',
            icon: <AlertCircle size={18} className="text-rose-600" />,
            glow: 'shadow-rose-500/10'
        },
        info: {
            bg: 'bg-blue-50/95',
            border: 'border-blue-200/50',
            accent: 'bg-blue-500',
            text: 'text-blue-700',
            icon: <Info size={18} className="text-blue-600" />,
            glow: 'shadow-blue-500/10'
        },
    };

    const variant = variants[type];

    return createPortal(
        <div
            className={`fixed top-6 right-6 z-[999999] flex items-center gap-4 px-3 py-3 min-w-[320px] rounded-2xl border backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] transform ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'
                } ${variant.bg} ${variant.border} shadow-xl ${variant.glow}`}
        >
            <div className="shrink-0 p-2 bg-white/50 rounded-xl">
                {variant.icon}
            </div>

            <div className="flex-1 min-w-0">
                <p className={`text-[13px] font-bold leading-tight tracking-tight ${variant.text}`}>
                    {message}
                </p>
            </div>

            <button
                onClick={handleClose}
                className="shrink-0 p-1.5 hover:bg-black/5 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
            >
                <X size={16} />
            </button>

            {/* Progress bar animation */}
            <div className="absolute bottom-0 left-0 h-1 bg-black/5 w-full overflow-hidden rounded-b-2xl">
                <div
                    className={`h-full ${variant.accent} transition-all duration-[3000ms] ease-linear`}
                    style={{ width: isVisible ? '0%' : '100%' }}
                />
            </div>
        </div>,
        document.body
    );
};
