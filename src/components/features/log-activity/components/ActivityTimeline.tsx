'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { H2, Badge, Subtext, Timeline, TimelineItem, TimelineIcon, TimelineContent, Avatar, Label, InfiniteScrollSentinel, Input } from '@/components/ui';
import { MessageSquare, RefreshCw, ChevronRight, Loader2, Search } from 'lucide-react';
import { LogActivity } from '@/lib/types';

interface ActivityTimelineProps {
    timelineActivities: LogActivity[];
    isLoadingMetadata: boolean;
    isLoadingActivities: boolean;
    hasMore: boolean;
    loadMore: () => void;
    isLoadingMore: boolean;
    totalCount: number;
    searchQuery: string;
    setSearchQuery: (val: string) => void;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
    timelineActivities,
    isLoadingMetadata,
    isLoadingActivities,
    hasMore,
    loadMore,
    isLoadingMore,
    totalCount,
    searchQuery,
    setSearchQuery
}) => {
    const router = useRouter();

    return (
        <div className="flex-1 bg-white border border-gray-100 rounded-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between shrink-0">
                <H2 className="text-sm font-semibold text-gray-900 !capitalize !">Riwayat Aktivitas</H2>
                <div className="flex items-center gap-3">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <Input
                            type="text"
                            placeholder="Cari aktivitas..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-9 h-8 text-xs bg-white border-gray-200"
                        />
                    </div>
                    <Badge>{totalCount} Aktivitas</Badge>
                </div>
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
    );
};
