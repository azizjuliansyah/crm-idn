'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { LogActivity, Profile, Quotation } from '@/lib/types';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { useRouter } from 'next/navigation';
import { ActivityHeader } from './components/ActivityHeader';
import { ActivityMetrics } from './components/ActivityMetrics';
import { ActivitySummaryChart } from './components/ActivitySummaryChart';
import { ActivityTimeline } from './components/ActivityTimeline';

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
        loadMore,
        totalCount: timelineTotalCount
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
            <ActivityHeader
                isAdmin={isAdmin}
                userFilter={userFilter}
                setUserFilter={setUserFilter}
                members={members}
                dateFilterType={dateFilterType}
                setDateFilterType={setDateFilterType}
                startDateFilter={startDateFilter}
                setStartDateFilter={setStartDateFilter}
                endDateFilter={endDateFilter}
                setendDateFilter={setendDateFilter}
            />

            <ActivityMetrics metrics={metrics} />

            <ActivitySummaryChart
                chartData={chartData}
                selectedMetrics={selectedMetrics}
                setSelectedMetrics={setSelectedMetrics}
            />

            <ActivityTimeline
                timelineActivities={timelineActivities}
                isLoadingMetadata={isLoadingMetadata}
                isLoadingActivities={isLoadingActivities}
                hasMore={hasMore}
                loadMore={loadMore}
                isLoadingMore={isLoadingMore}
                totalCount={timelineTotalCount || 0}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
            />
        </div>
    );
};



