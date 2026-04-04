'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button, Subtext, Label, SearchInput, H2 } from '@/components/ui';
import { useAppStore } from '@/lib/store/useAppStore';

import { Sop } from '@/lib/types';
import {
  Plus, FileText, BookOpen,
  ChevronRight, Tag, Eye, Loader2 as LoaderIcon
} from 'lucide-react';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSopsQuery } from '@/lib/hooks/useSopsQuery';
import { BaseDataTable, ColumnConfig } from '@/components/shared/tables/BaseDataTable';
import { SopSortKey, useSopFilters } from '@/lib/hooks/useSopFilters';

interface Props {
  company: { id: number };
  categoryId?: number;
  isArchive?: boolean;
}

export const SopListView: React.FC<Props> = ({ company, categoryId, isArchive }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useAppStore();
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const filters = useSopFilters();

  const {
    data: sopsData,
    isLoading: loading,
    refetch: refetchSops
  } = useSopsQuery({
    companyId: String(company.id),
    categoryId,
    isArchive,
    searchTerm: filters.searchTerm,
    sortConfig: filters.sortConfig,
    page,
    pageSize,
  });

  const sops = sopsData?.data || [];

  useEffect(() => {
    const success = searchParams.get('success');
    if (success) {
      showToast(success === 'created' ? 'SOP Berhasil Dibuat' : 'SOP Berhasil Diperbarui', 'success');

      // Clean up the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
    }
  }, [searchParams, showToast]);

  // Reset page to 1 on search change
  useEffect(() => {
    setPage(1);
  }, [filters.searchTerm]);

  const columns: ColumnConfig<Sop>[] = useMemo(() => [
    {
      header: 'No. Dokumen',
      key: 'document_number' as SopSortKey,
      sortable: true,
      className: 'px-8 py-6',
      render: (sop: Sop) => (
        <Label className="text-[11px] font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded">
          {sop.document_number}
        </Label>
      )
    },
    {
      header: 'Judul Prosedur',
      key: 'title' as SopSortKey,
      sortable: true,
      className: 'px-8 py-6',
      render: (sop: Sop) => (
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <FileText size={18} />
          </div>
          <div className="min-w-0">
            <Link
              href={`/dashboard/sops/${sop.id}`}
              onMouseEnter={() => router.prefetch(`/dashboard/sops/${sop.id}`)}
              className="text-sm font-semibold text-gray-900 leading-tight hover:text-blue-600 transition-colors uppercase block truncate"
            >
              {sop.title}
            </Link>
            <Subtext className="text-[10px] text-gray-400 font-medium mt-1">
              Terbit: {new Date(sop.revision_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Subtext>
          </div>
        </div>
      )
    },
    {
      header: 'Kategori / Divisi',
      key: 'category_id' as any,
      sortable: false,
      className: 'px-8 py-6',
      render: (sop: Sop) => (
        <div className="flex items-center gap-2">
          <Tag size={12} className="text-gray-300" />
          <Label className="text-[11px] text-gray-600 uppercase">
            {sop.sop_categories?.name || 'Manual'}
          </Label>
        </div>
      )
    },
    {
      header: 'Revisi',
      key: 'revision_number' as SopSortKey,
      sortable: true,
      className: 'px-8 py-6 text-center',
      render: (sop: Sop) => (
        <Label className="text-[11px] text-gray-500">
          Rev {String(sop.revision_number).padStart(2, '0')}
        </Label>
      )
    },
    {
      header: 'Status',
      key: 'status' as SopSortKey,
      sortable: true,
      className: 'px-8 py-6 text-center',
      render: (sop: Sop) => (
        <Label className={`px-3 py-1 rounded-full text-[9px] uppercase border ${sop.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
          }`}>
          {sop.status}
        </Label>
      )
    },
    {
      header: 'Aksi',
      key: 'actions' as any,
      className: 'px-8 py-6 text-center',
      render: (sop: Sop) => (
        <div className="flex items-center justify-center gap-2 transition-all">
          <ActionButton
            icon={Eye}
            variant="blue"
            href={`/dashboard/sops/${sop.id}`}
            title="Lihat Detail"
          />
          <ChevronRight size={16} className="text-gray-300" />
        </div>
      )
    }
  ], [router]);

  if (loading && sops.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-100 min-h-[400px]">
      <LoaderIcon className="animate-spin text-blue-600 mb-4" size={32} />
      <Subtext className="text-[10px] uppercase text-gray-400">Sinkronisasi Dokumen...</Subtext>
    </div>
  );

  return (
    <div className="space-y-6 flex flex-col">
      <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <H2 className="text-xl">{isArchive ? 'Arsip SOP' : 'Standard Operating Procedure'}</H2>
            <Subtext className="text-[10px] uppercase">Kelola daftar dokumen standard operating procedure perusahaan.</Subtext>
          </div>
          <div className="flex items-center gap-3">
            {!isArchive && (
              <Button
                onClick={() => router.push("/dashboard/sops/create")}
                leftIcon={<Plus size={14} strokeWidth={3} />}
                className="!px-6 py-2.5 text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-blue-100"
                variant="primary"
                size="sm"
              >
                Buat SOP Baru
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-50">
          <div className="w-[400px] shrink-0">
            <SearchInput
              placeholder="Cari berdasarkan nomor atau judul SOP..."
              value={filters.searchTerm}
              onChange={e => filters.setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="h-[75vh]">
        <BaseDataTable
          data={sops}
          columns={columns}
          isLoading={loading}
          sortConfig={filters.sortConfig as any}
          onSort={filters.handleSort as any}
          page={page}
          pageSize={pageSize}
          totalCount={sopsData?.totalCount || 0}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          emptyMessage="Tidak ada dokumen SOP ditemukan"
          emptyIcon={<BookOpen size={48} />}
        />
      </div>
    </div>
  );
};
