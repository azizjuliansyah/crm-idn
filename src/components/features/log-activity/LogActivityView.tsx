'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { LogActivity, Profile, Quotation } from '@/lib/types';
import { H2, Subtext, Input, Button, Label, Avatar, SectionHeader, Timeline, TimelineItem, TimelineIcon, TimelineContent, DateFilterDropdown, ComboBox, Checkbox, InfiniteScrollSentinel, Badge } from '@/components/ui';
import { Search, Calendar, MessageSquare, RefreshCw, Layers, Target, Users, Megaphone, CheckCircle, ArrowRight, Loader2, ArrowUp, Link as LinkIcon, FileText, ChevronRight, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';

interface Props {
    user: Profile;
    companyId: number;
}

export const LogActivityView: React.FC<Props> = ({ user, companyId }) => {
    const router = useRouter();

    // Filters
    const [startDateFilter, setStartDateFilter] = useState<string>('');
    const [endDateFilter, setendDateFilter] = useState<string>('');
    const [dateFilterType, setDateFilterType] = useState<string>('30');

    const [searchQuery, setSearchQuery] = useState('');
    const [userFilter, setUserFilter] = useState<string>(user.id);

    // Data
    const [members, setMembers] = useState<any[]>([]);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [metricsActivities, setMetricsActivities] = useState<LogActivity[]>([]);
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [leadsCount, setLeadsCount] = useState(0);
    const [leadsData, setLeadsData] = useState<any[]>([]);
    const [chartDateRange, setChartDateRange] = useState({ start: '', end: '' });
    const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);

    const [selectedMetrics, setSelectedMetrics] = useState({
        leadsCount: true,
        statusChangeLeads: true,
        quotationsCount: true,
        followUpCount: true,
        statusChangeDeals: true
    });

    const getDateRange = useCallback(() => {
        let fromDateStr = new Date('2000-01-01').toISOString();
        let toDateStr = new Date('2100-01-01').toISOString();

        if (dateFilterType === 'custom') {
            if (startDateFilter) {
                const d = new Date(startDateFilter);
                d.setHours(0, 0, 0, 0);
                fromDateStr = d.toISOString();
            }
            if (endDateFilter) {
                const d = new Date(endDateFilter);
                d.setHours(23, 59, 59, 999);
                toDateStr = d.toISOString();
            }
        } else if (dateFilterType === 'this_month') {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            fromDateStr = start.toISOString();
            toDateStr = end.toISOString();
        } else if (dateFilterType === 'last_month') {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            fromDateStr = start.toISOString();
            toDateStr = end.toISOString();
        } else if (dateFilterType !== 'all') {
            const daysAgo = parseInt(dateFilterType);
            if (!isNaN(daysAgo)) {
                const filterDate = new Date();
                filterDate.setDate(filterDate.getDate() - daysAgo);
                filterDate.setHours(0, 0, 0, 0);
                fromDateStr = filterDate.toISOString();

                const now = new Date();
                now.setHours(23, 59, 59, 999);
                toDateStr = now.toISOString();
            }
        }
        return { fromDateStr, toDateStr };
    }, [dateFilterType, startDateFilter, endDateFilter]);

    const fetchData = useCallback(async () => {
        if (!companyId) return;
        setIsLoadingMetadata(true);

        try {
            const { fromDateStr, toDateStr } = getDateRange();
            setChartDateRange({ start: fromDateStr, end: toDateStr });

            // 1. Fetch Members and Check Admin Status
            const { data: membersData } = await supabase
                .from('company_members')
                .select('*, profile:profiles!inner(full_name, avatar_url, email), role:company_roles(name)')
                .eq('company_id', companyId);

            let currentUserIsAdmin = false;
            if (membersData) {
                setMembers(membersData);
                const currentMember = membersData.find((m: any) => m.user_id === user.id);
                currentUserIsAdmin = currentMember?.role?.name?.toLowerCase() === 'admin' || currentMember?.role?.name?.toLowerCase() === 'administrator' || currentMember?.role?.name?.toLowerCase() === 'owner' || (user as any).platform_role === 'ADMIN';
                setIsAdmin(currentUserIsAdmin);

                if (!currentUserIsAdmin && userFilter === 'all') {
                    setUserFilter(user.id);
                }
            }

            // 2. Fetch Activities for Metrics (limited fields)
            const activeFilter = (!currentUserIsAdmin && userFilter === 'all') ? user.id : userFilter;
            let actQuery = supabase
                .from('log_activities')
                .select(`id, activity_type, lead_id, deal_id, content, created_at, user_id`)
                .gte('created_at', fromDateStr)
                .lte('created_at', toDateStr);
            
            if (activeFilter !== 'all') {
                actQuery = actQuery.eq('user_id', activeFilter);
            }

            const { data: actData } = await actQuery.order('created_at', { ascending: false });

            if (actData) {
                setMetricsActivities(actData as any);
            }

            // 3. Fetch Quotations count
            const { data: quoteData } = await supabase
                .from('quotations')
                .select('id, created_at')
                .eq('company_id', companyId)
                .gte('created_at', fromDateStr)
                .lte('created_at', toDateStr);

            if (quoteData) setQuotations(quoteData as any);

            // 4. Fetch Leads for chart
            const { data: leadsFetched, count: lCount } = await supabase
                .from('leads')
                .select('id, created_at', { count: 'exact' })
                .eq('company_id', companyId)
                .gte('created_at', fromDateStr)
                .lte('created_at', toDateStr);

            if (leadsFetched) {
                setLeadsCount(lCount || 0);
                setLeadsData(leadsFetched || []);
            }

        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingMetadata(false);
        }
    }, [companyId, getDateRange, user.id, userFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Timeline Activities Fetching with Infinite Scroll
    const fetchTimelineActivities = useCallback(async ({ from, to }: { from: number, to: number }) => {
        if (!companyId) return { data: [], error: null, count: 0 };
        
        console.log(`[Infinite Scroll] Memuat aktivitas dari index ${from} ke ${to}...`);
        
        const { fromDateStr, toDateStr } = getDateRange();
        
        const activeFilter = (!isAdmin && userFilter === 'all') ? user.id : userFilter;

        let query = supabase
            .from('log_activities')
            .select(`
                *,
                profile:profiles(id, full_name, avatar_url),
                deal:deals(id, name, company_id),
                lead:leads(id, name, company_id)
            `, { count: 'exact' })
            .gte('created_at', fromDateStr)
            .lte('created_at', toDateStr);

        if (activeFilter !== 'all') {
            query = query.eq('user_id', activeFilter);
        }

        if (searchQuery) {
            query = query.ilike('content', `%${searchQuery}%`);
        }

        const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
        return { data: data || [], error, count };
    }, [companyId, getDateRange, isAdmin, user.id, userFilter, searchQuery]);

    const {
        data: timelineActivities,
        isLoading: isLoadingActivities,
        isLoadingMore,
        hasMore,
        loadMore
    } = useInfiniteScroll<LogActivity>(fetchTimelineActivities, {
        pageSize: 15,
        dependencies: [companyId, dateFilterType, startDateFilter, endDateFilter, userFilter, searchQuery]
    });

    // Derived Metrics from metricsActivities
    const metrics = useMemo(() => {
        let statusChangeLeads = 0;
        let statusChangeDeals = 0;
        let followUpCount = 0;

        metricsActivities.forEach(a => {
            if (a.activity_type === 'status_change' && a.lead_id && !a.deal_id) {
                statusChangeLeads++;
            }
            if (a.activity_type === 'status_change' && a.deal_id) {
                statusChangeDeals++;
            }
            if (a.content.toLowerCase().includes('follow up baru dicatat')) {
                followUpCount++;
            }
        });

        return {
            leadsCount,
            statusChangeLeads,
            quotationsCount: quotations.length,
            followUpCount,
            statusChangeDeals
        };
    }, [metricsActivities, leadsCount, quotations]);

    const chartData = useMemo(() => {
        if (!chartDateRange.start || !chartDateRange.end) return [];
        
        const start = new Date(chartDateRange.start);
        const end = new Date(chartDateRange.end);
        
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > 365) return []; 
        
        const dateMap: Record<string, any> = {};
        
        for (let i = 0; i <= diffDays; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
            dateMap[dateStr] = {
                name: dateStr,
                'Jumlah Leads': 0,
                'Status Leads Berubah': 0,
                'Penawaran Dibuat': 0,
                'Follow Up Tercatat': 0,
                'Status Deals Berubah': 0,
            };
        }
        
        leadsData.forEach(lead => {
            const dateStr = new Date(lead.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
            if (dateMap[dateStr]) dateMap[dateStr]['Jumlah Leads']++;
        });
        
        quotations.forEach(q => {
             const dateStr = new Date(q.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
            if (dateMap[dateStr]) dateMap[dateStr]['Penawaran Dibuat']++;
        });
        
        metricsActivities.forEach(a => {
            const dateStr = new Date(a.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
            if (!dateMap[dateStr]) return;
            
            if (a.activity_type === 'status_change' && a.lead_id && !a.deal_id) {
                dateMap[dateStr]['Status Leads Berubah']++;
            }
            if (a.activity_type === 'status_change' && a.deal_id) {
                dateMap[dateStr]['Status Deals Berubah']++;
            }
            if (a.content.toLowerCase().includes('follow up baru dicatat')) {
                dateMap[dateStr]['Follow Up Tercatat']++;
            }
        });
        
        const result = Object.values(dateMap).map(day => {
            const newDay = { name: day.name } as any;
            if (selectedMetrics.leadsCount) newDay['Jumlah Leads'] = day['Jumlah Leads'];
            if (selectedMetrics.statusChangeLeads) newDay['Status Leads Berubah'] = day['Status Leads Berubah'];
            if (selectedMetrics.quotationsCount) newDay['Penawaran Dibuat'] = day['Penawaran Dibuat'];
            if (selectedMetrics.followUpCount) newDay['Follow Up Tercatat'] = day['Follow Up Tercatat'];
            if (selectedMetrics.statusChangeDeals) newDay['Status Deals Berubah'] = day['Status Deals Berubah'];
            return newDay;
        });

        if (result.length > 0 && Object.keys(result[0]).length === 1) return [];

        return result;
    }, [metricsActivities, leadsData, quotations, chartDateRange, selectedMetrics]);


    return (
        <div className="flex flex-col bg-white space-y-6 min-h-full">

            {/* HEADER & FILTERS */}
            <div className="flex flex-col gap-4 bg-gray-50/50 p-6 rounded-2xl border border-gray-100 shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <H2 className="text-xl font-semibold text-gray-900 !capitalize !">Aktivitas Tim Sales</H2>
                        <Subtext className="text-gray-500 !capitalize ! mt-1">Pantau seluruh aktivitas leads dan deals dalam satu tempat.</Subtext>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                        {isAdmin && (
                            <div className="border-r border-gray-100 pr-2 mr-1">
                                <ComboBox
                                    value={userFilter}
                                    onChange={(val: string | number) => setUserFilter(val.toString())}
                                    options={[
                                        { value: 'all', label: 'SEMUA ANGGOTA TIM' },
                                        ...members.map(m => ({
                                            value: m.user_id,
                                            label: (m.profile?.full_name || m.user_id).toUpperCase()
                                        }))
                                    ]}
                                    className="w-64 border-none !px-2 !py-0 shadow-none ring-0"
                                    placeholderSize="text-[10px] font-bold text-gray-900 uppercase "
                                />
                            </div>
                        )}
                        <DateFilterDropdown
                            value={dateFilterType}
                            onChange={setDateFilterType}
                            startDate={startDateFilter}
                            endDate={endDateFilter}
                            onStartDateChange={setStartDateFilter}
                            onEndDateChange={setendDateFilter}
                            hideAllOption={true}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <Input
                            type="text"
                            placeholder="Cari kata kunci aktivitas..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-10 bg-white border-gray-200"
                        />
                    </div>
                </div>
            </div>

            {/* METRIC CARDS */}
            <div className="grid grid-cols-5 gap-4 shrink-0">
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

            {/* SUMMARY CHART */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shrink-0 flex flex-col gap-6">
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
                    <div 
                        onClick={() => setSelectedMetrics(s => ({ ...s, leadsCount: !s.leadsCount }))}
                        className={`flex items-center gap-2 cursor-pointer transition-all px-3 py-1.5 rounded-full ${selectedMetrics.leadsCount ? 'bg-indigo-50' : 'hover:bg-gray-50 opacity-50 grayscale'}`}
                    >
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                        <span className={`text-[11px] font-bold uppercase ${selectedMetrics.leadsCount ? 'text-indigo-600' : 'text-gray-500'}`}>Jumlah Leads</span>
                    </div>
                    <div 
                        onClick={() => setSelectedMetrics(s => ({ ...s, statusChangeLeads: !s.statusChangeLeads }))}
                        className={`flex items-center gap-2 cursor-pointer transition-all px-3 py-1.5 rounded-full ${selectedMetrics.statusChangeLeads ? 'bg-blue-50' : 'hover:bg-gray-50 opacity-50 grayscale'}`}
                    >
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <span className={`text-[11px] font-bold uppercase ${selectedMetrics.statusChangeLeads ? 'text-blue-600' : 'text-gray-500'}`}>Status Leads Berubah</span>
                    </div>
                    <div 
                        onClick={() => setSelectedMetrics(s => ({ ...s, quotationsCount: !s.quotationsCount }))}
                        className={`flex items-center gap-2 cursor-pointer transition-all px-3 py-1.5 rounded-full ${selectedMetrics.quotationsCount ? 'bg-emerald-50' : 'hover:bg-gray-50 opacity-50 grayscale'}`}
                    >
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className={`text-[11px] font-bold uppercase ${selectedMetrics.quotationsCount ? 'text-emerald-600' : 'text-gray-500'}`}>Penawaran Dibuat</span>
                    </div>
                    <div 
                        onClick={() => setSelectedMetrics(s => ({ ...s, followUpCount: !s.followUpCount }))}
                        className={`flex items-center gap-2 cursor-pointer transition-all px-3 py-1.5 rounded-full ${selectedMetrics.followUpCount ? 'bg-amber-50' : 'hover:bg-gray-50 opacity-50 grayscale'}`}
                    >
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className={`text-[11px] font-bold uppercase ${selectedMetrics.followUpCount ? 'text-amber-600' : 'text-gray-500'}`}>Follow Up Tercatat</span>
                    </div>
                    <div 
                        onClick={() => setSelectedMetrics(s => ({ ...s, statusChangeDeals: !s.statusChangeDeals }))}
                        className={`flex items-center gap-2 cursor-pointer transition-all px-3 py-1.5 rounded-full ${selectedMetrics.statusChangeDeals ? 'bg-rose-50' : 'hover:bg-gray-50 opacity-50 grayscale'}`}
                    >
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        <span className={`text-[11px] font-bold uppercase ${selectedMetrics.statusChangeDeals ? 'text-rose-600' : 'text-gray-500'}`}>Status Deals Berubah</span>
                    </div>
                </div>
            </div>

            {/* ACTIVITY TIMELINE LIST */}
            <div className="flex-1 bg-white border border-gray-100 rounded-2xl flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between shrink-0">
                    <H2 className="text-sm font-semibold text-gray-900 !capitalize !">Riwayat Aktivitas</H2>
                    <Badge>{metricsActivities.length} Aktivitas</Badge>
                </div>

                <div className="p-6 max-h-[600px] overflow-y-auto custom-scrollbar">
                    {isLoadingMetadata && timelineActivities.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                            <Loader2 size={24} className="animate-spin text-blue-500" />
                            <Subtext className="text-xs font-medium">Memuat data aktivitas...</Subtext>
                        </div>
                    ) : timelineActivities.length === 0 && !isLoadingActivities ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 py-10">
                            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                                <MessageSquare size={24} className="text-gray-300" />
                            </div>
                            <Subtext className="text-xs font-medium">Tidak ada aktivitas pada rentang waktu ini.</Subtext>
                        </div>
                    ) : (
                        <Timeline className="max-w-4xl">
                            {timelineActivities.map((act, i) => {
                                const isDeals = !!act.deal_id;
                                const isLeads = !!act.lead_id;
                                const contextLabel = isDeals ? 'Deal' : isLeads ? 'Lead' : 'System';
                                const contextName = isDeals ? (act as any).deal?.name : isLeads ? (act as any).lead?.name : '';

                                let Icon = MessageSquare;
                                let iconCol = 'text-gray-500 bg-gray-50';
                                if (act.activity_type === 'status_change') { Icon = RefreshCw; iconCol = 'text-blue-500 bg-blue-50'; }
                                else if (act.activity_type === 'system') { Icon = Loader2; iconCol = 'text-amber-500 bg-amber-50'; }

                                return (
                                    <TimelineItem key={act.id} isLast={i === timelineActivities.length - 1 && !hasMore}>
                                        <TimelineIcon className={iconCol}>
                                            <Icon size={14} />
                                        </TimelineIcon>
                                        <TimelineContent>
                                            <div className="bg-white border border-gray-100 rounded-lg p-2.5 shadow-sm hover:shadow-md transition-shadow relative group">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar name={act.profile?.full_name || 'User'} src={act.profile?.avatar_url} size="sm" className="w-6 h-6" />
                                                        <div className="flex items-center gap-2">
                                                            <Label className="text-[11px] font-bold text-gray-900">{act.profile?.full_name}</Label>
                                                            <Subtext className="text-[9px] text-gray-400 font-medium">
                                                                {new Date(act.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                                <span className="mx-1">•</span>
                                                                {new Date(act.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                            </Subtext>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Label className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${isDeals ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                            {contextLabel}
                                                        </Label>
                                                        {contextName && (
                                                            <Link
                                                                href={isDeals ? `/dashboard/deals` : `/dashboard/leads`}
                                                                onMouseEnter={() => router.prefetch(isDeals ? `/dashboard/deals` : `/dashboard/leads`)}
                                                                className="p-1 h-auto text-gray-400 hover:text-blue-600 hover:bg-transparent opacity-0 group-hover:opacity-100 transition-all"
                                                            >
                                                                <ChevronRight size={12} />
                                                            </Link>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="text-[13px] text-gray-600 leading-snug pl-1">
                                                    {act.content}
                                                    {contextName && (
                                                        <span className="ml-2 inline-flex items-center gap-1.5">
                                                            <span className="text-gray-300 text-[10px]">/</span>
                                                            <Link
                                                                href={isDeals ? `/dashboard/deals` : `/dashboard/leads`}
                                                                onMouseEnter={() => router.prefetch(isDeals ? `/dashboard/deals` : `/dashboard/leads`)}
                                                                className="text-[10px] font-semibold text-blue-500 hover:bg-blue-50 px-1 rounded cursor-pointer transition-colors"
                                                            >
                                                                {contextName}
                                                            </Link>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </TimelineContent>
                                    </TimelineItem>
                                );
                            })}
                            <InfiniteScrollSentinel 
                                onIntersect={loadMore}
                                enabled={hasMore}
                                isLoading={isLoadingMore}
                            />
                        </Timeline>
                    )}
                </div>
            </div>

        </div>
    );
};

const MetricCard = ({ title, value, icon, colorClass, href }: { title: string, value: number, icon: React.ReactNode, colorClass: string, href?: string }) => {
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

