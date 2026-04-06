'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';

import { 
    Button, H2, Subtext, Label, Badge
} from '@/components/ui';

import { supabase } from '@/lib/supabase';
import { Company, SalesRequest, SalesRequestCategory } from '@/lib/types';
import {
    Plus, FileQuestion, Loader2,
    Check, Trash2, Clock, User, FileText, FileCheck, Zap, X
} from 'lucide-react';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { ConfirmBulkDeleteModal } from '@/components/shared/modals/ConfirmBulkDeleteModal';
import { ConfirmBulkStatusModal } from '@/components/shared/modals/ConfirmBulkStatusModal';
import { StandardFilterBar } from '@/components/shared/filters/StandardFilterBar';
import { BulkActionGroup } from '@/components/shared/filters/BulkActionGroup';
import { useSalesRequestMutations } from '@/lib/hooks/useSalesRequestsQuery';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store/useAppStore';
import { useSalesRequestsQuery } from '@/lib/hooks/useSalesRequestsQuery';
import { useSalesRequestFilters, SortKey } from '@/lib/hooks/useSalesRequestFilters';
import { SalesRequestFilterBar } from './SalesRequestFilterBar';
import { BaseDataTable, ColumnConfig } from '@/components/shared/tables/BaseDataTable';

interface Props {
    company: Company;
    categoryId: number;
}

export const SalesRequestsView: React.FC<Props> = ({ company, categoryId }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { activeCompanyMembers, user, showToast } = useAppStore();
    
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const filters = useSalesRequestFilters();

    const [category, setCategory] = useState<SalesRequestCategory | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isConfirmBulkDeleteOpen, setIsConfirmBulkDeleteOpen] = useState(false);
    const [isConfirmBulkStatusOpen, setIsConfirmBulkStatusOpen] = useState(false);

    const {
        data: requestsData,
        isLoading: loading,
        refetch: refetchRequests
    } = useSalesRequestsQuery({
        companyId: String(company.id),
        categoryIdIndex: Number(categoryId),
        searchTerm: filters.searchTerm,
        filterStatus: filters.filterStatus,
        sortConfig: filters.sortConfig,
        page,
        pageSize,
    });

    const requests = requestsData?.data || [];

    const fetchCategory = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('sales_request_categories')
                .select('*')
                .eq('id', categoryId)
                .single();
            if (error) throw error;
            setCategory(data);
        } catch (err) {
            console.error(err);
        }
    }, [categoryId]);

    useEffect(() => {
        fetchCategory();
    }, [fetchCategory]);

    useEffect(() => {
        const success = searchParams.get('success');
        if (success) {
            const message = success === 'created'
                ? 'Request baru berhasil dibuat'
                : 'Request berhasil diperbarui';
            showToast(message, 'success');

            const newUrl = window.location.pathname;
            window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
        }
    }, [searchParams, showToast]);

    // Reset page to 1 on filter changes
    useEffect(() => {
        setPage(1);
    }, [filters.searchTerm, filters.filterStatus]);

    const { bulkDeleteSalesRequests, bulkUpdateSalesRequestsStatus } = useSalesRequestMutations();

    const handleBulkDelete = async () => {
        setIsProcessing(true);
        try {
            await bulkDeleteSalesRequests.mutateAsync(selectedIds);
            showToast(`${selectedIds.length} request berhasil dihapus.`, 'success');
            setSelectedIds([]);
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setIsProcessing(false);
            setIsConfirmBulkDeleteOpen(false);
        }
    };

    const handleBulkUpdateStatus = async (status: string) => {
        setIsProcessing(true);
        try {
            await bulkUpdateSalesRequestsStatus.mutateAsync({ ids: selectedIds, status });
            showToast(`${selectedIds.length} request berhasil diperbarui.`, 'success');
            setSelectedIds([]);
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setIsProcessing(false);
            setIsConfirmBulkStatusOpen(false);
        }
    };

    const executeDelete = async () => {
        if (!confirmDelete.id) return;
        setIsProcessing(true);
        try {
            const { error } = await supabase.from('sales_requests').delete().eq('id', confirmDelete.id);
            if (error) throw error;
            setConfirmDelete({ isOpen: false, id: null });
            refetchRequests();
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const hasApprovalPermission = useMemo(() => {
        if (user?.platform_role === 'ADMIN') return true;
        const currentMember = activeCompanyMembers.find(m => m.user_id === user?.id);
        return currentMember?.company_roles?.permissions.includes('Persetujuan Sales Request') || false;
    }, [user, activeCompanyMembers]);

    const columns: ColumnConfig<SalesRequest>[] = useMemo(() => [
        {
            header: 'ID',
            key: 'id' as SortKey,
            sortable: true,
            className: 'w-20 font-mono text-[11px] text-gray-400 py-5 px-6',
            render: (r: SalesRequest) => `#${String(r.id).padStart(4, '0')}`
        },
        {
            header: 'Tanggal',
            key: 'created_at' as SortKey,
            sortable: true,
            className: 'py-5',
            render: (r: SalesRequest) => (
                <div className="flex items-center gap-2 text-gray-400">
                    <Clock size={12} strokeWidth={2.5} />
                    <Label className="text-[11px] font-medium">{new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</Label>
                </div>
            )
        },
        {
            header: 'Pelanggan',
            key: 'client' as SortKey,
            sortable: true,
            className: 'py-5',
            render: (r: SalesRequest) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] uppercase shadow-sm border border-indigo-100">{r.client?.name?.charAt(0) || '?'}</div>
                    <div>
                        <Subtext className="text-xs text-gray-900 ">{r.client?.name || 'Unknown'}</Subtext>
                        <Subtext className="text-[10px] !text-gray-400 mt-1 uppercase italic font-medium">{r.client?.client_company?.name || 'Personal'}</Subtext>
                    </div>
                </div>
            )
        },
        {
            header: 'Referensi',
            key: 'reference' as any,
            sortable: false,
            className: 'py-5',
            render: (r: SalesRequest) => r.quotation ? (
                <Badge variant="secondary" className="gap-1.5 rounded-lg">
                    <FileText size={10} strokeWidth={2.5} />
                    <Label className="!text-indigo-600">{r.quotation.number}</Label>
                </Badge>
            ) : r.proforma ? (
                <Badge variant="success" className="gap-1.5 rounded-lg">
                    <FileCheck size={10} strokeWidth={2.5} />
                    <Label className="!text-emerald-600">{r.proforma.number}</Label>
                </Badge>
            ) : (
                <Label className="text-[10px] text-gray-300 italic">NO REF</Label>
            )
        },
        {
            header: 'Pemohon',
            key: 'requester_id' as any,
            sortable: false,
            className: 'py-5',
            render: (r: SalesRequest) => (
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 shadow-sm">
                        <User size={10} strokeWidth={2.5} className="text-gray-400" />
                    </div>
                    <Label className="text-[11px] text-gray-600 font-medium">
                        {r.profile?.full_name ||
                            activeCompanyMembers.find(m => m.user_id === r.requester_id)?.profile?.full_name ||
                            'Data Tidak Tersedia'}
                    </Label>
                </div>
            )
        },
        {
            header: 'Catatan',
            key: 'notes' as any,
            sortable: false,
            className: 'py-5',
            render: (r: SalesRequest) => (
                <Subtext className="text-[11px] line-clamp-2 max-w-[200px]" title={r.notes || ''}>
                    {r.notes || '-'}
                </Subtext>
            )
        },
        {
            header: 'Status',
            key: 'status' as SortKey,
            sortable: true,
            className: 'text-center py-5',
            render: (r: SalesRequest) => (
                <div className="flex flex-col items-center gap-2">
                    <Badge variant={
                        r.status === 'Pending' ? 'neutral' :
                            r.status === 'Approved' ? 'emerald' :
                                'rose'
                    } className="min-w-[80px] justify-center uppercase text-[9px] py-1 font-bold">
                        {r.status}
                    </Badge>
                    {(r.urgency_level) && (
                        <div className={`px-2 py-1 rounded-full text-[9px] font-bold tracking-wide uppercase flex items-center gap-1 shadow-sm border ${r.urgency_level.color ? `bg-${r.urgency_level.color}-100 text-${r.urgency_level.color}-700 border-${r.urgency_level.color}-200` : 'bg-amber-100 text-amber-700 border-amber-200'
                            }`}>
                            <Zap size={10} fill="currentColor" />
                            {r.urgency_level?.name || 'Urgent'}
                        </div>
                    )}
                </div>
            )
        },
        {
            header: 'Aksi',
            key: 'actions' as any,
            className: 'text-center',
            render: (r: SalesRequest) => (
                <div className="flex items-center justify-center gap-2">
                    {r.status === 'Pending' && hasApprovalPermission && (
                        <>
                            <ActionButton
                                icon={Check}
                                variant="emerald"
                                onClick={async () => {
                                    setIsProcessing(true);
                                    try {
                                        const { error } = await supabase
                                            .from('sales_requests')
                                            .update({ status: 'Approved' })
                                            .eq('id', r.id);
                            
                                        if (error) throw error;
                                        showToast(`Request telah di-approved.`, 'success');
                                        refetchRequests();
                                    } catch (err: any) {
                                        showToast(err.message, 'error');
                                    } finally {
                                        setIsProcessing(false);
                                    }
                                }}
                                title="Approve"
                            />
                            <ActionButton
                                icon={X}
                                variant="rose"
                                onClick={async () => {
                                    setIsProcessing(true);
                                    try {
                                        const { error } = await supabase
                                            .from('sales_requests')
                                            .update({ status: 'Rejected' })
                                            .eq('id', r.id);
                            
                                        if (error) throw error;
                                        showToast(`Request telah di-rejected.`, 'success');
                                        refetchRequests();
                                    } catch (err: any) {
                                        showToast(err.message, 'error');
                                    } finally {
                                        setIsProcessing(false);
                                    }
                                }}
                                title="Reject"
                            />
                        </>
                    )}
                    <ActionButton
                        icon={Trash2}
                        variant="rose"
                        onClick={() => setConfirmDelete({ isOpen: true, id: r.id })}
                        title="Hapus"
                    />
                </div>
            )
        }
    ], [activeCompanyMembers, hasApprovalPermission]);

    if (loading && requests.length === 0) return (
        <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-2xl border border-gray-100 min-h-[400px]">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
            <Subtext className="text-[10px] uppercase text-gray-400">Memuat Request...</Subtext>
        </div>
    );

    return (
        <div className="flex flex-col gap-6 text-gray-900">
            <StandardFilterBar
                title={category?.name || 'Sales Request'}
                subtitle="Kelola dan pantau seluruh permintaan dalam kategori ini."
                searchTerm={filters.searchTerm}
                onSearchChange={filters.setSearchTerm}
                searchPlaceholder="Cari request atau pelanggan..."
                primaryAction={{
                    label: "Request Baru",
                    onClick: () => router.push(`/dashboard/sales/requests/${categoryId}/create`),
                    icon: <Plus size={14} strokeWidth={3} />
                }}
                bulkActions={
                    <BulkActionGroup
                        selectedCount={selectedIds.length}
                        onUpdateStatus={() => setIsConfirmBulkStatusOpen(true)}
                        onDelete={() => setIsConfirmBulkDeleteOpen(true)}
                    />
                }
            >
                <SalesRequestFilterBar
                    filterStatus={filters.filterStatus}
                    setFilterStatus={filters.setFilterStatus}
                />
            </StandardFilterBar>

            <div className="h-[75vh]">
                <BaseDataTable
                    data={requests}
                    columns={columns}
                    isLoading={loading}
                    sortConfig={filters.sortConfig as any}
                    onSort={filters.handleSort as any}
                    page={page}
                    pageSize={pageSize}
                    totalCount={requestsData?.totalCount || 0}
                    onPageChange={setPage}
                    onPageSizeChange={(size) => {
                        setPageSize(size);
                        setPage(1);
                    }}
                    emptyMessage="Belum ada request"
                    emptyIcon={<FileQuestion size={48} />}
                    
                    // Selection Props
                    selectedIds={selectedIds}
                    onToggleSelect={(id) => setSelectedIds(prev => prev.includes(id as number) ? prev.filter(i => i !== id) : [...prev, id as number])}
                    onToggleSelectAll={() => setSelectedIds(selectedIds.length === requests.length ? [] : requests.map(r => r.id))}
                />
            </div>

            <ConfirmDeleteModal
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, id: null })}
                onConfirm={async () => {
                   if (confirmDelete.id) {
                       setIsProcessing(true);
                       try {
                           const { error } = await supabase.from('sales_requests').delete().eq('id', confirmDelete.id);
                            if (error) throw error;
                            setConfirmDelete({ isOpen: false, id: null });
                            refetchRequests();
                        } catch (err: any) {
                            showToast(err.message, 'error');
                        } finally {
                           setIsProcessing(false);
                       }
                   }
                }}
                title="Hapus Request"
                itemName="Request ini"
                isProcessing={isProcessing}
                description="Apakah Anda yakin ingin menghapus catatan permintaan ini?"
            />

            <ConfirmBulkDeleteModal
                isOpen={isConfirmBulkDeleteOpen}
                onClose={() => setIsConfirmBulkDeleteOpen(false)}
                onConfirm={handleBulkDelete}
                count={selectedIds.length}
                description="Hapus seluruh request yang dipilih secara permanen?"
                isProcessing={isProcessing}
            />

            <ConfirmBulkStatusModal
                isOpen={isConfirmBulkStatusOpen}
                onClose={() => setIsConfirmBulkStatusOpen(false)}
                onConfirm={(status) => handleBulkUpdateStatus(String(status))}
                count={selectedIds.length}
                title="Update Status Masal"
                label="Pilih Status Baru"
                description="Pilih status baru untuk seluruh request yang dipilih."
                options={[
                    { id: 'Pending', name: 'PENDING' },
                    { id: 'Approved', name: 'APPROVED' },
                    { id: 'Rejected', name: 'REJECTED' }
                ]}
                isProcessing={isProcessing}
            />

        </div>
    );
};
