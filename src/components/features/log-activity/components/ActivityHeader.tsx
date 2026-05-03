'use client';

import React from 'react';
import { H2, Subtext, ComboBox, DateFilterDropdown } from '@/components/ui';

interface ActivityHeaderProps {
    isAdmin: boolean;
    userFilter: string;
    setUserFilter: (val: string) => void;
    members: any[];
    dateFilterType: string;
    setDateFilterType: (val: string) => void;
    startDateFilter: string;
    setStartDateFilter: (val: string) => void;
    endDateFilter: string;
    setendDateFilter: (val: string) => void;
}

export const ActivityHeader: React.FC<ActivityHeaderProps> = ({
    isAdmin,
    userFilter,
    setUserFilter,
    members,
    dateFilterType,
    setDateFilterType,
    startDateFilter,
    setStartDateFilter,
    endDateFilter,
    setendDateFilter
}) => {
    return (
        <div className="flex flex-col gap-4 bg-white p-6 rounded-2xl border-2 border-gray-300 shrink-0">
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
        </div>
    );
};
