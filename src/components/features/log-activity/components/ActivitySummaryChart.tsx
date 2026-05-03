'use client';

import React from 'react';
import { H2, Subtext } from '@/components/ui';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line } from 'recharts';

interface ActivitySummaryChartProps {
    chartData: any[];
    selectedMetrics: {
        leadsCount: boolean;
        statusChangeLeads: boolean;
        quotationsCount: boolean;
        followUpCount: boolean;
        statusChangeDeals: boolean;
    };
    setSelectedMetrics: React.Dispatch<React.SetStateAction<{
        leadsCount: boolean;
        statusChangeLeads: boolean;
        quotationsCount: boolean;
        followUpCount: boolean;
        statusChangeDeals: boolean;
    }>>;
}

export const ActivitySummaryChart: React.FC<ActivitySummaryChartProps> = ({
    chartData,
    selectedMetrics,
    setSelectedMetrics
}) => {
    return (
        <div className="bg-white border-2 border-gray-300 rounded-2xl p-8 shrink-0 flex flex-col gap-6">
            <div>
                <H2 className="text-sm font-semibold text-gray-900 !capitalize !">Grafik Ringkasan Aktivitas</H2>
                <Subtext className="text-xs text-gray-500 mt-1">Visualisasi tren aktivitas berdasarkan filter.</Subtext>
            </div>

            <div className="h-64 w-full">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 'bold' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                            <Tooltip
                                cursor={{ stroke: '#f3f4f6', strokeWidth: 2 }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: '12px' }}
                            />

                            {selectedMetrics.leadsCount && (
                                <Line type="monotone" dataKey="Jumlah Leads" stroke="#6366f1" strokeWidth={3} dot={{ stroke: '#6366f1', strokeWidth: 2, r: 4, fill: '#fff' }} activeDot={{ r: 6 }} />
                            )}
                            {selectedMetrics.statusChangeLeads && (
                                <Line type="monotone" dataKey="Status Leads Berubah" stroke="#3b82f6" strokeWidth={3} dot={{ stroke: '#3b82f6', strokeWidth: 2, r: 4, fill: '#fff' }} activeDot={{ r: 6 }} />
                            )}
                            {selectedMetrics.quotationsCount && (
                                <Line type="monotone" dataKey="Penawaran Dibuat" stroke="#10b981" strokeWidth={3} dot={{ stroke: '#10b981', strokeWidth: 2, r: 4, fill: '#fff' }} activeDot={{ r: 6 }} />
                            )}
                            {selectedMetrics.followUpCount && (
                                <Line type="monotone" dataKey="Follow Up Tercatat" stroke="#f59e0b" strokeWidth={3} dot={{ stroke: '#f59e0b', strokeWidth: 2, r: 4, fill: '#fff' }} activeDot={{ r: 6 }} />
                            )}
                            {selectedMetrics.statusChangeDeals && (
                                <Line type="monotone" dataKey="Status Deals Berubah" stroke="#f43f5e" strokeWidth={3} dot={{ stroke: '#f43f5e', strokeWidth: 2, r: 4, fill: '#fff' }} activeDot={{ r: 6 }} />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <span className="text-sm text-gray-400 font-medium">Pilih metrik untuk menampilkan grafik</span>
                    </div>
                )}
            </div>

            {/* Custom Interactive Legend (Filters) below chart */}
            <div className="flex items-center gap-4 flex-wrap justify-center border-t border-gray-50 pt-4 mt-2">
                <LegendItem
                    active={selectedMetrics.leadsCount}
                    onClick={() => setSelectedMetrics(s => ({ ...s, leadsCount: !s.leadsCount }))}
                    color="bg-indigo-500"
                    label="Jumlah Leads"
                    activeBg="bg-indigo-50"
                    activeText="text-indigo-600"
                />
                <LegendItem
                    active={selectedMetrics.statusChangeLeads}
                    onClick={() => setSelectedMetrics(s => ({ ...s, statusChangeLeads: !s.statusChangeLeads }))}
                    color="bg-blue-500"
                    label="Status Leads Berubah"
                    activeBg="bg-blue-50"
                    activeText="text-blue-600"
                />
                <LegendItem
                    active={selectedMetrics.quotationsCount}
                    onClick={() => setSelectedMetrics(s => ({ ...s, quotationsCount: !s.quotationsCount }))}
                    color="bg-emerald-500"
                    label="Penawaran Dibuat"
                    activeBg="bg-emerald-50"
                    activeText="text-emerald-600"
                />
                <LegendItem
                    active={selectedMetrics.followUpCount}
                    onClick={() => setSelectedMetrics(s => ({ ...s, followUpCount: !s.followUpCount }))}
                    color="bg-amber-500"
                    label="Follow Up Tercatat"
                    activeBg="bg-amber-50"
                    activeText="text-amber-600"
                />
                <LegendItem
                    active={selectedMetrics.statusChangeDeals}
                    onClick={() => setSelectedMetrics(s => ({ ...s, statusChangeDeals: !s.statusChangeDeals }))}
                    color="bg-rose-500"
                    label="Status Deals Berubah"
                    activeBg="bg-rose-50"
                    activeText="text-rose-600"
                />
            </div>
        </div>
    );
};

const LegendItem = ({ active, onClick, color, label, activeBg, activeText }: { active: boolean, onClick: () => void, color: string, label: string, activeBg: string, activeText: string }) => (
    <div
        onClick={onClick}
        className={`flex items-center gap-2 cursor-pointer transition-all px-3 py-1.5 rounded-full ${active ? activeBg : 'hover:bg-gray-50 opacity-50 grayscale'}`}
    >
        <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <span className={`text-[11px] font-bold uppercase ${active ? activeText : 'text-gray-500'}`}>{label}</span>
    </div>
);
