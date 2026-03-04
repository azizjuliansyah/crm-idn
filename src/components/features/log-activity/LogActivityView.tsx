'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { LogActivity, Profile, Quotation } from '@/lib/types';
import { H2, Subtext, Input, Button, Label, Avatar, SectionHeader, Timeline, TimelineItem, TimelineIcon, TimelineContent, DateFilterDropdown, ComboBox } from '@/components/ui';
import { Search, Calendar, MessageSquare, RefreshCw, Layers, Target, Users, Megaphone, CheckCircle, ArrowRight, Loader2, ArrowUp, Link as LinkIcon, FileText, ChevronRight, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
    user: Profile;
    companyId: number;
}

export const LogActivityView: React.FC<Props> = ({ user, companyId }) => {
    const router = useRouter();

    // Filters
    const [startDateFilter, setStartDateFilter] = useState<string>('');
    const [endDateFilter, setendDateFilter] = useState<string>('');
    const [dateFilterType, setDateFilterType] = useState<string>('all');

    const [searchQuery, setSearchQuery] = useState('');
    const [userFilter, setUserFilter] = useState<string>(user.id);

    // Data
    const [members, setMembers] = useState<any[]>([]);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [activities, setActivities] = useState<LogActivity[]>([]);
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [leadsCount, setLeadsCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!companyId) return;
        setIsLoading(true);

        try {
            // Compute date range based on filter
            let fromDateStr = new Date('2000-01-01').toISOString(); // arbitrary far past for 'all'
            let toDateStr = new Date('2100-01-01').toISOString();   // arbitrary far future

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
                // Number of days (e.g. '7', '30')
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

            // Fetch Members and Check Admin Status
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

                // If previously userFilter was "all" but user is no longer admin (e.g. switch company), reset it
                if (!currentUserIsAdmin && userFilter === 'all') {
                    setUserFilter(user.id);
                }
            }

            const { data: actData, error: actError } = await supabase
                .from('log_activities')
                .select(`
          *,
          profile:profiles(id, full_name, avatar_url),
          deal:deals(id, name, company_id),
          lead:leads(id, name, company_id)
        `)
                .gte('created_at', fromDateStr)
                .lte('created_at', toDateStr)
                .order('created_at', { ascending: false });

            if (actError) {
                console.error("Error fetching activities:", actError);
            } else {
                // Filter out activities that don't belong to current company (safe-guard)
                const filteredActs = (actData as any[]).filter(a => {
                    const matchesCompany = (a.deal && a.deal.company_id === companyId) ||
                        (a.lead && a.lead.company_id === companyId) ||
                        (!a.deal && !a.lead); // System/user activities without context

                    // Filter by selected user filter or lock to current user if not admin
                    const activeFilter = (!currentUserIsAdmin && userFilter === 'all') ? user.id : userFilter;
                    const matchesUser = activeFilter === 'all' ? true : a.user_id === activeFilter;

                    return matchesCompany && matchesUser;
                });

                // Filter by search query on client side to avoid complex ILIKE across relations
                const searchedActs = searchQuery
                    ? filteredActs.filter(a => a.content.toLowerCase().includes(searchQuery.toLowerCase()) || a.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))
                    : filteredActs;

                setActivities(searchedActs as any);
            }

            // Fetch Quotations count for "Jumlah penawaran dibuat"
            const { data: quoteData, error: quoteError } = await supabase
                .from('quotations')
                .select('id, created_at')
                .eq('company_id', companyId)
                .gte('created_at', fromDateStr)
                .lte('created_at', toDateStr);

            if (quoteError) console.error("Error fetching quotes:", quoteError);
            else setQuotations(quoteData as any);

            // Fetch Leads count
            const { count: lCount, error: leadsError } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', companyId)
                .gte('created_at', fromDateStr)
                .lte('created_at', toDateStr);

            if (leadsError) console.error("Error fetching leads:", leadsError);
            else setLeadsCount(lCount || 0);

        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [companyId, dateFilterType, startDateFilter, endDateFilter, searchQuery, userFilter, user.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Derived Metrics
    const metrics = useMemo(() => {
        let statusChangeLeads = 0;
        let statusChangeDeals = 0;
        let followUpCount = 0;

        activities.forEach(a => {
            // Perubahan status leads
            if (a.activity_type === 'status_change' && a.lead_id && !a.deal_id) {
                statusChangeLeads++;
            }
            // Perubahan status deals
            if (a.activity_type === 'status_change' && a.deal_id) {
                statusChangeDeals++;
            }
            // Jumlah follow up (assuming it comes from system or contains specific text based on how we insert it)
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
    }, [activities, leadsCount, quotations]);


    return (
        <div className="flex flex-col bg-white space-y-6 min-h-full">

            {/* HEADER & FILTERS */}
            <div className="flex flex-col gap-4 bg-gray-50/50 p-6 rounded-2xl border border-gray-100 shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <H2 className="text-xl font-semibold text-gray-900 !capitalize !tracking-tight">Aktivitas Tim Sales</H2>
                        <Subtext className="text-gray-500 !capitalize !tracking-tight mt-1">Pantau seluruh aktivitas leads dan deals dalam satu tempat.</Subtext>
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
                                    placeholderSize="text-[10px] font-bold text-gray-900 uppercase tracking-tight"
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
                />
                <MetricCard
                    title="Status Leads Berubah"
                    value={metrics.statusChangeLeads}
                    icon={<RefreshCw size={18} />}
                    colorClass="bg-blue-50 text-blue-600 border-blue-100"
                />
                <MetricCard
                    title="Penawaran Dibuat"
                    value={metrics.quotationsCount}
                    icon={<FileText size={18} />}
                    colorClass="bg-emerald-50 text-emerald-600 border-emerald-100"
                />
                <MetricCard
                    title="Follow Up Tercatat"
                    value={metrics.followUpCount}
                    icon={<MessageSquare size={18} />}
                    colorClass="bg-amber-50 text-amber-600 border-amber-100"
                />
                <MetricCard
                    title="Status Deals Berubah"
                    value={metrics.statusChangeDeals}
                    icon={<Layers size={18} />}
                    colorClass="bg-rose-50 text-rose-600 border-rose-100"
                />
            </div>

            {/* ACTIVITY TIMELINE LIST */}
            <div className="flex-1 bg-white border border-gray-100 rounded-2xl flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between shrink-0">
                    <H2 className="text-sm font-semibold text-gray-900 !capitalize !tracking-tight">Riwayat Aktivitas</H2>
                    <Badge>{activities.length} Aktivitas</Badge>
                </div>

                <div className="p-6 max-h-[600px] overflow-y-auto custom-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                            <Loader2 size={24} className="animate-spin text-blue-500" />
                            <Subtext className="text-xs font-medium">Memuat data aktivitas...</Subtext>
                        </div>
                    ) : activities.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 py-10">
                            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                                <MessageSquare size={24} className="text-gray-300" />
                            </div>
                            <Subtext className="text-xs font-medium">Tidak ada aktivitas pada rentang waktu ini.</Subtext>
                        </div>
                    ) : (
                        <Timeline className="max-w-4xl">
                            {activities.map((act, i) => {
                                const isDeals = !!act.deal_id;
                                const isLeads = !!act.lead_id;
                                const contextLabel = isDeals ? 'Deal' : isLeads ? 'Lead' : 'System';
                                const contextName = isDeals ? (act as any).deal?.name : isLeads ? (act as any).lead?.name : '';

                                let Icon = MessageSquare;
                                let iconCol = 'text-gray-500 bg-gray-50';
                                if (act.activity_type === 'status_change') { Icon = RefreshCw; iconCol = 'text-blue-500 bg-blue-50'; }
                                else if (act.activity_type === 'system') { Icon = Loader2; iconCol = 'text-amber-500 bg-amber-50'; }

                                return (
                                    <TimelineItem key={act.id} isLast={i === activities.length - 1}>
                                        <TimelineIcon className={iconCol}>
                                            <Icon size={14} />
                                        </TimelineIcon>
                                        <TimelineContent>
                                            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative group">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar name={act.profile?.full_name || 'User'} src={act.profile?.avatar_url} size="sm" />
                                                        <div>
                                                            <Label className="text-xs font-bold text-gray-900">{act.profile?.full_name}</Label>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <Subtext className="text-[10px] text-gray-400 font-medium">
                                                                    {new Date(act.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} pukul {new Date(act.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                                </Subtext>
                                                                <span className="w-1 h-1 rounded-full bg-gray-200" />
                                                                <Label className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${isDeals ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                                    {contextLabel}
                                                                </Label>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {contextName && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="!p-1.5 h-auto text-gray-400 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-all flex hidden lg:flex items-center gap-2"
                                                            onClick={() => {
                                                                if (isDeals) router.push(`/dashboard/deals`); // Provide logic to open specific deal if possible, else push to deals list
                                                                else if (isLeads) router.push(`/dashboard/leads`);
                                                            }}
                                                            title={`Buka ${contextLabel}`}
                                                        >
                                                            <span className="text-[10px] font-bold uppercase">Lihat {contextLabel}</span>
                                                            <ChevronRight size={14} />
                                                        </Button>
                                                    )}
                                                </div>

                                                <div className="text-sm text-gray-700 leading-relaxed pl-1 mb-3">
                                                    {act.content}
                                                </div>

                                                {contextName && (
                                                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                                                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Terkait:</span>
                                                        <span className="text-xs font-semibold text-gray-700 !capitalize hover:text-blue-600 cursor-pointer transition-colors"
                                                            onClick={() => {
                                                                if (isDeals) router.push(`/dashboard/deals`);
                                                                else if (isLeads) router.push(`/dashboard/leads`);
                                                            }}
                                                        >
                                                            {contextName}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </TimelineContent>
                                    </TimelineItem>
                                );
                            })}
                        </Timeline>
                    )}
                </div>
            </div>

        </div>
    );
};

const Badge = ({ children }: { children: React.ReactNode }) => (
    <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-blue-100">
        {children}
    </span>
);

const MetricCard = ({ title, value, icon, colorClass }: { title: string, value: number, icon: React.ReactNode, colorClass: string }) => (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className="flex justify-between items-start relative z-10">
            <div>
                <Subtext className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{title}</Subtext>
                <H2 className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{value.toLocaleString('id-ID')}</H2>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm transition-transform group-hover:scale-110 ${colorClass}`}>
                {icon}
            </div>
        </div>
        <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-[0.03] transition-transform group-hover:scale-150 ${colorClass.split(' ')[0]}`} />
    </div>
);
