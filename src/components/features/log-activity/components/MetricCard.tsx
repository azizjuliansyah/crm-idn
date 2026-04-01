'use client';

import React from 'react';
import Link from 'next/link';
import { H2, Subtext } from '@/components/ui';

interface MetricCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    colorClass: string;
    href?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, colorClass, href }) => {
    const content = (
        <>
            <div className="flex justify-between items-start relative z-10">
                <div>
                    <Subtext className="text-[11px] font-bold text-gray-400 uppercase mb-2">{title}</Subtext>
                    <H2 className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{value.toLocaleString('id-ID')}</H2>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm transition-transform group-hover:scale-110 ${colorClass}`}>
                    {icon}
                </div>
            </div>
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-[0.03] transition-transform group-hover:scale-150 ${colorClass.split(' ')[0]}`} />
        </>
    );

    if (href) {
        return (
            <Link
                href={href}
                className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-shadow relative overflow-hidden group block"
            >
                {content}
            </Link>
        );
    }

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-shadow relative overflow-hidden group">
            {content}
        </div>
    );
};
