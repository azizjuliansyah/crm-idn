'use client';

import React from 'react';
import { Target, RefreshCw, FileText, MessageSquare, Layers } from 'lucide-react';
import { MetricCard } from './MetricCard';

interface ActivityMetricsProps {
    metrics: {
        leadsCount: number;
        statusChangeLeads: number;
        quotationsCount: number;
        followUpCount: number;
        statusChangeDeals: number;
    };
}

export const ActivityMetrics: React.FC<ActivityMetricsProps> = ({ metrics }) => {
    return (
        <div className="grid grid-cols-5 gap-6 shrink-0">
            <MetricCard
                title="Jumlah Leads"
                value={metrics.leadsCount}
                icon={<Target size={18} />}
                colorClass="bg-indigo-50 text-indigo-600 border-indigo-100"
                href="/dashboard/leads"
            />
            <MetricCard
                title="Status Leads Berubah"
                value={metrics.statusChangeLeads}
                icon={<RefreshCw size={18} />}
                colorClass="bg-blue-50 text-blue-600 border-blue-100"
                href="/dashboard/leads"
            />
            <MetricCard
                title="Penawaran Dibuat"
                value={metrics.quotationsCount}
                icon={<FileText size={18} />}
                colorClass="bg-emerald-50 text-emerald-600 border-emerald-100"
                href="/dashboard/sales/quotations"
            />
            <MetricCard
                title="Follow Up Tercatat"
                value={metrics.followUpCount}
                icon={<MessageSquare size={18} />}
                colorClass="bg-amber-50 text-amber-600 border-amber-100"
                href="/dashboard/leads"
            />
            <MetricCard
                title="Status Deals Berubah"
                value={metrics.statusChangeDeals}
                icon={<Layers size={18} />}
                colorClass="bg-rose-50 text-rose-600 border-rose-100"
                href="/dashboard/deals"
            />
        </div>
    );
};
