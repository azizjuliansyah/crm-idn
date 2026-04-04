'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { H2, Subtext, Label, Badge, Toast, ToastType, Button } from '@/components/ui';

import { supabase } from '@/lib/supabase';
import { Company, KwitansiRequest } from '@/lib/types';
import {
    Plus, FileQuestion, Clock, Check, Trash2, FilePlus, Zap, FileDown, User, X, FileText, FileCheck, Building
} from 'lucide-react';
import { BaseDataTable, ColumnConfig } from '@/components/shared/tables/BaseDataTable';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { ConfirmBulkDeleteModal } from '@/components/shared/modals/ConfirmBulkDeleteModal';
import { ConfirmBulkStatusModal } from '@/components/shared/modals/ConfirmBulkStatusModal';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateTemplate1, generateTemplate5, generateTemplate6 } from '@/lib/pdf-templates';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { useKwitansiRequestsQuery } from '@/lib/hooks/useKwitansiRequestsQuery';
import { useKwitansiRequestFilters } from '@/lib/hooks/useKwitansiRequestFilters';
import { KwitansiRequestFilterBar } from './KwitansiRequestFilterBar';
import { StandardFilterBar } from '@/components/shared/filters/StandardFilterBar';
import { BulkActionGroup } from '@/components/shared/filters/BulkActionGroup';

interface Props {
    company: Company;
}

export const KwitansiRequestsView: React.FC<Props> = ({ company }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { activeCompanyMembers, user } = useDashboard();
    
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const filters = useKwitansiRequestFilters();

    const [isProcessing, setIsProcessing] = useState(false);

    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isConfirmBulkDeleteOpen, setIsConfirmBulkDeleteOpen] = useState(false);
    const [isConfirmBulkStatusOpen, setIsConfirmBulkStatusOpen] = useState(false);
    const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
        isOpen: false,
        message: '',
        type: 'success',
    });

    const {
        data: requestsData,
        isLoading: loading,
        refetch: refetchRequests
    } = useKwitansiRequestsQuery({
        companyId: String(company.id),
        searchTerm: filters.searchTerm,
        filterStatus: filters.filterStatus,
        sortConfig: filters.sortConfig,
        page,
        pageSize,
    });

    const requests = requestsData?.data || [];
    const totalCount = requestsData?.totalCount || 0;

    useEffect(() => {
        const success = searchParams.get('success');
        if (success) {
            setToast({ isOpen: true, message: 'Request baru berhasil diajukan', type: 'success' });
            const newUrl = window.location.pathname;
            window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
        }
    }, [searchParams]);

    // Reset page to 1 on filter changes
    useEffect(() => {
        setPage(1);
    }, [filters.searchTerm, filters.filterStatus]);

    const handleUpdateStatus = async (id: number, newStatus: 'Approved' | 'Rejected') => {
        setIsProcessing(true);
        try {
            const { error } = await supabase
                .from('kwitansi_requests')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;
            setToast({ isOpen: true, message: `Request telah di-${newStatus.toLowerCase()}.`, type: 'success' });
            refetchRequests();
        } catch (err: any) {
            setToast({ isOpen: true, message: err.message, type: 'error' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCreateKwitansi = async (reqId: number) => {
        setIsProcessing(true);
        try {
            const { data: req, error: reqErr } = await supabase
                .from('kwitansi_requests')
                .select('*, invoice:invoices(*, invoice_items(*)), proforma:proformas(*, proforma_items(*))')
                .eq('id', reqId)
                .single();

            if (reqErr) throw reqErr;
            if (req.kwitansi_id) throw new Error('Kwitansi sudah dibuat untuk request ini.');

            const kwtNumber = `KWT-${Date.now().toString().slice(-6)}`;
            const { data: kwt, error: kwtErr } = await supabase
                .from('kwitansis')
                .insert({
                    company_id: company.id,
                    client_id: req.client_id,
                    invoice_id: req.invoice_id,
                    proforma_id: (req as any).proforma_id,
                    number: kwtNumber,
                    date: new Date().toISOString().split('T')[0],
                    status: 'Paid',
                    total: req.invoice?.total || req.proforma?.total || 0,
                    subtotal: req.invoice?.subtotal || req.proforma?.subtotal || 0,
                    tax_type: req.invoice?.tax_type || req.proforma?.tax_type || null,
                    tax_value: req.invoice?.tax_value || req.proforma?.tax_value || 0,
                    discount_type: req.invoice?.discount_type || req.proforma?.discount_type || 'Rp',
                    discount_value: req.invoice?.discount_value || req.proforma?.discount_value || 0
                })
                .select()
                .single();

            if (kwtErr) throw kwtErr;

            const sourceItems = req.invoice?.invoice_items || req.proforma?.proforma_items || [];
            if (sourceItems.length > 0) {
                const { error: itemsErr } = await supabase
                    .from('kwitansi_items')
                    .insert(sourceItems.map((it: any) => ({
                        kwitansi_id: kwt.id,
                        product_id: it.product_id,
                        description: it.description,
                        qty: it.qty,
                        price: it.price,
                        total: it.total,
                        unit_name: it.unit_name
                    })));
                if (itemsErr) throw itemsErr;
            }

            const { error: updErr } = await supabase
                .from('kwitansi_requests')
                .update({ kwitansi_id: kwt.id })
                .eq('id', reqId);

            if (updErr) throw updErr;
            setToast({ isOpen: true, message: `Kwitansi berhasil dibuat.`, type: 'success' });
            refetchRequests();
        } catch (err: any) {
            setToast({ isOpen: true, message: err.message, type: 'error' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownloadKwitansi = async (r: KwitansiRequest) => {
        if (!r.kwitansi_id) return;
        setIsProcessing(true);

        try {
            const { data: kwt, error: kwtErr } = await supabase
                .from('kwitansis')
                .select('*, client:clients(*, client_company:client_companies(*)), kwitansi_items(*, products(*))')
                .eq('id', r.kwitansi_id)
                .single();

            if (kwtErr) throw kwtErr;
            if (!kwt) throw new Error('Kwitansi tidak ditemukan.');

            const { data: templateSetting } = await supabase
                .from('document_template_settings')
                .select('*')
                .eq('company_id', company.id)
                .eq('document_type', 'kwitansi')
                .maybeSingle();

            const templateId = templateSetting?.template_id || 'template1';
            const config = templateSetting?.config || {};
            config.document_type = 'kwitansi';

            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const padX = 18;

            if (templateId === 'template1') {
                await generateTemplate1(doc, kwt, config, company, pageWidth, padX);
            } else if (templateId === 'template5') {
                await generateTemplate5(doc, kwt, config, company, pageWidth, padX);
            } else if (templateId === 'template6') {
                await generateTemplate6(doc, kwt, config, company, pageWidth, padX);
            } else {
                doc.setFillColor('#4F46E5');
                doc.rect(0, 0, pageWidth, 40, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(24);
                doc.setFont('helvetica', 'bold');
                doc.text('KWITANSI PENJUALAN', 20, 25);

                autoTable(doc, {
                    startY: 50,
                    head: [['Produk', 'Deskripsi', 'Qty', 'Harga', 'Total']],
                    body: kwt.kwitansi_items?.map((it: any) => [
                        String(it.products?.name || ''),
                        String(it.description || ''),
                        `${it.qty} ${it.unit_name || ''}`,
                        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(it.price),
                        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(it.total)
                    ]) || [],
                    theme: 'striped',
                    headStyles: { fillColor: '#4F46E5' }
                });
            }

            doc.save(`${kwt.number}.pdf`);
        } catch (err: any) {
            setToast({ isOpen: true, message: err.message, type: 'error' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBulkDelete = async () => {
        setIsProcessing(true);
        try {
            const { error } = await supabase.from('kwitansi_requests').delete().in('id', selectedIds);
            if (error) throw error;
            setToast({ isOpen: true, message: `${selectedIds.length} request berhasil dihapus.`, type: 'success' });
            setSelectedIds([]);
            refetchRequests();
        } catch (err: any) {
            setToast({ isOpen: true, message: err.message, type: 'error' });
        } finally {
            setIsProcessing(false);
            setIsConfirmBulkDeleteOpen(false);
        }
    };

    const handleBulkUpdateStatus = async (newStatus: string) => {
        setIsProcessing(true);
        try {
            const { error } = await supabase.from('kwitansi_requests').update({ status: newStatus }).in('id', selectedIds);
            if (error) throw error;
            setToast({ isOpen: true, message: `${selectedIds.length} request berhasil diupdate ke ${newStatus}.`, type: 'success' });
            setSelectedIds([]);
            refetchRequests();
        } catch (err: any) {
            setToast({ isOpen: true, message: err.message, type: 'error' });
        } finally {
            setIsProcessing(false);
            setIsConfirmBulkStatusOpen(false);
        }
    };

    const hasApprovalPermission = useMemo(() => {
        if (user?.platform_role === 'ADMIN') return true;
        const currentMember = activeCompanyMembers.find(m => m.user_id === user?.id);
        return currentMember?.company_roles?.permissions.includes('Persetujuan Request Kwitansi') || false;
    }, [user, activeCompanyMembers]);

    const columns: ColumnConfig<KwitansiRequest>[] = useMemo(() => [
        {
            header: 'ID',
            key: 'id',
            sortable: true,
            className: 'w-20 font-mono text-[11px] text-gray-400 py-5 px-6',
            render: (r: KwitansiRequest) => `#${String(r.id).padStart(4, '0')}`
        },
        {
            header: 'Tanggal',
            key: 'created_at',
            sortable: true,
            render: (r: KwitansiRequest) => (
                <div className="flex items-center gap-2 text-gray-400">
                    <Clock size={12} strokeWidth={2.5} />
                    <Label className="text-[11px] ">{new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</Label>
                </div>
            )
        },
        {
            header: 'Pelanggan',
            key: 'client_id',
            sortable: true,
            render: (r: KwitansiRequest) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo600 flex items-center justify-center  text-[10px] uppercase shadow-sm border border-indigo-100">{r.client?.name?.charAt(0) || '?'}</div>
                    <div>
                        <Subtext className="text-xs text-gray-900 ">{r.client?.name}</Subtext>
                        <Subtext className="text-[10px] !text-gray-400 mt-1 uppercase  italic">{r.client?.client_company?.name || 'Personal'}</Subtext>
                    </div>
                </div>
            )
        },
        {
            header: 'Referensi',
            key: 'reference',
            render: (r: KwitansiRequest) => (
                <div>
                    {r.invoice ? (
                        <Badge variant="secondary" className="gap-1.5 rounded-lg border-indigo-200 bg-indigo-50">
                            <FileCheck size={10} className="text-indigo-600" strokeWidth={2.5} />
                            <Label className="!text-indigo-600">{r.invoice.number}</Label>
                        </Badge>
                    ) : r.proforma ? (
                        <Badge variant="secondary" className="gap-1.5 rounded-lg border-amber-200 bg-amber-50">
                            <FileText size={10} className="text-amber-600" strokeWidth={2.5} />
                            <Label className="!text-amber-600">{r.proforma.number}</Label>
                        </Badge>
                    ) : (
                        <Label className="text-[10px] text-gray-300 italic ">NO REF</Label>
                    )}
                </div>
            )
        },
        {
            header: 'Pemohon',
            key: 'requester_id',
            render: (r: KwitansiRequest) => (
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
                        <User size={10} strokeWidth={2.5} className="text-gray-400" />
                    </div>
                    <Label className="text-[11px]  text-gray-600">
                        {r.profile?.full_name ||
                            activeCompanyMembers.find(m => m.user_id === r.requester_id)?.profile?.full_name ||
                            'Data Tidak Tersedia'}
                    </Label>
                </div>
            )
        },
        {
            header: 'Status',
            key: 'status',
            sortable: true,
            headerClassName: 'text-center',
            className: 'text-center',
            render: (r: KwitansiRequest) => (
                <div className="flex flex-col items-center gap-2">
                    <Badge variant={
                        r.status === 'Pending' ? 'neutral' :
                            r.status === 'Approved' ? 'emerald' :
                                'rose'
                    } className="capitalize">
                        {r.status}
                    </Badge>
                    {(r.urgency_level) && (
                        <div className={`px-2 py-1 rounded-full text-[9px] font-bold tracking-wide uppercase flex items-center gap-1 shadow-sm border ${
                            r.urgency_level ? `bg-${r.urgency_level.color}-100 text-${r.urgency_level.color}-700 border-${r.urgency_level.color}-200` : 'bg-amber-100 text-amber-700 border-amber-200'
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
            key: 'actions',
            headerClassName: 'text-center',
            className: 'text-center',
            render: (r: KwitansiRequest) => (
                <div className="flex items-center justify-center gap-2">
                    {r.status === 'Pending' && hasApprovalPermission && (
                        <>
                            <ActionButton
                                icon={Check}
                                variant="emerald"
                                onClick={() => handleUpdateStatus(r.id, 'Approved')}
                                title="Approve"
                            />
                            <ActionButton
                                icon={X}
                                variant="rose"
                                onClick={() => handleUpdateStatus(r.id, 'Rejected')}
                                title="Reject"
                            />
                        </>
                    )}
                    {r.status === 'Approved' && !r.kwitansi_id && hasApprovalPermission && (
                        <ActionButton
                            icon={FilePlus}
                            variant="indigo"
                            onClick={() => handleCreateKwitansi(r.id)}
                            title="Buat Kwitansi"
                        />
                    )}
                    {r.status === 'Approved' && r.kwitansi_id && (
                        <>
                            <ActionButton
                                icon={FileDown}
                                variant="emerald"
                                onClick={() => handleDownloadKwitansi(r)}
                                title="Download Kwitansi"
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
    ], [activeCompanyMembers, hasApprovalPermission, handleDownloadKwitansi, handleUpdateStatus, handleCreateKwitansi]);

    return (
        <div className="flex flex-col gap-6 text-gray-900">
            <StandardFilterBar
                title="Request Kwitansi"
                subtitle="Kelola dan pantau seluruh permintaan pembuatan kwitansi pelanggan."
                searchTerm={filters.searchTerm}
                onSearchChange={filters.setSearchTerm}
                searchPlaceholder="Cari request..."
                primaryAction={{
                    label: "Request Baru",
                    onClick: () => router.push('/dashboard/sales/kwitansi-requests/create'),
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
                <KwitansiRequestFilterBar
                  filterStatus={filters.filterStatus}
                  setFilterStatus={filters.setFilterStatus}
                />
            </StandardFilterBar>

            <div className="h-[75vh]">
                <BaseDataTable
                    data={requests}
                    columns={columns}
                    sortConfig={filters.sortConfig}
                    onSort={filters.handleSort as (key: string) => void}
                    page={page}
                    pageSize={pageSize}
                    totalCount={totalCount}
                    onPageChange={setPage}
                    onPageSizeChange={(size) => {
                        setPageSize(size);
                        setPage(1);
                    }}
                    isLoading={loading}
                    emptyMessage="Belum ada request kwitansi"
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
                            const { error } = await supabase.from('kwitansi_requests').delete().eq('id', confirmDelete.id);
                            if (error) throw error;
                            setConfirmDelete({ isOpen: false, id: null });
                            refetchRequests();
                        } catch (err: any) {
                            setToast({ isOpen: true, message: err.message, type: 'error' });
                        } finally {
                            setIsProcessing(false);
                        }
                    }
                }}
                title="Hapus Request"
                itemName="Request Kwitansi ini"
                isProcessing={isProcessing}
                description="Apakah Anda yakin ingin menghapus catatan permintaan kwitansi ini?"
            />
            <ConfirmBulkDeleteModal
                isOpen={isConfirmBulkDeleteOpen}
                onClose={() => setIsConfirmBulkDeleteOpen(false)}
                onConfirm={handleBulkDelete}
                count={selectedIds.length}
                description="Hapus seluruh request kwitansi yang dipilih secara permanen?"
                isProcessing={isProcessing}
            />

            <ConfirmBulkStatusModal
                isOpen={isConfirmBulkStatusOpen}
                onClose={() => setIsConfirmBulkStatusOpen(false)}
                onConfirm={(status) => handleBulkUpdateStatus(String(status))}
                count={selectedIds.length}
                title="Update Status Masal"
                description="Pilih status baru untuk seluruh request yang dipilih."
                options={[
                    { id: 'Pending', name: 'PENDING' },
                    { id: 'Approved', name: 'APPROVED' },
                    { id: 'Rejected', name: 'REJECTED' }
                ]}
                isProcessing={isProcessing}
            />

            <Toast
                isOpen={toast.isOpen}
                message={toast.message}
                type={toast.type}
                onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
};
