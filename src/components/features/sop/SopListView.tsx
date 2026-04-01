'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button, Table, TableHeader, TableBody, TableRow, TableCell, Subtext, Label, SearchInput, H2 } from '@/components/ui';
import { useAppStore } from '@/lib/store/useAppStore';

import { supabase } from '@/lib/supabase';
import { Company, Sop } from '@/lib/types';
import {
  Plus, FileText, Loader2, BookOpen,
  ChevronRight, Tag, Eye
} from 'lucide-react';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { useRouter, useSearchParams } from 'next/navigation';

interface Props {
  company: Company;
  categoryId?: number;
  isArchive?: boolean;
}

export const SopListView: React.FC<Props> = ({ company, categoryId, isArchive }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useAppStore();
  const [sops, setSops] = useState<Sop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSops = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('sops')
        .select('*, sop_categories(*)')
        .eq('company_id', company.id);

      if (isArchive) {
        query = query.eq('is_archived', true);
      } else {
        query = query.eq('is_archived', false);
        if (categoryId) {
          query = query.eq('category_id', categoryId);
        }
      }

      const { data, error } = await query.order('document_number').order('revision_number', { ascending: false });
      if (error) throw error;
      if (data) setSops(data as any);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [company.id, categoryId, isArchive, showToast]);

  useEffect(() => {
    fetchSops();
  }, [fetchSops]);

  useEffect(() => {
    const success = searchParams.get('success');
    if (success) {
      showToast(success === 'created' ? 'SOP Berhasil Dibuat' : 'SOP Berhasil Diperbarui', 'success');

      // Clean up the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
    }
  }, [searchParams, showToast]);

  const filteredSops = sops.filter(s =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.document_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleView = (id: number) => {
    router.push(`/dashboard/sops/${id}`);
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-blue-600 mb-4" /><Subtext className="text-[10px]  uppercase  text-gray-400">Sinkronisasi Dokumen...</Subtext></div>;

  return (
    <div className="space-y-6 flex flex-col">
      <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <H2 className="text-xl">{isArchive ? 'Arsip SOP' : 'Standard Operating Procedure'}</H2>
            <Subtext className="text-[10px] uppercase ">Kelola daftar dokumen standard operating procedure perusahaan.</Subtext>
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
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-[80vh] mb-4 flex flex-col overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
          <Table className="border-separate border-spacing-0">
            <TableHeader className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-md">
              <TableRow>
                <TableCell isHeader>No. Dokumen</TableCell>
                <TableCell isHeader>Judul Prosedur</TableCell>
                <TableCell isHeader>Kategori / Divisi</TableCell>
                <TableCell isHeader className="text-center">Revisi</TableCell>
                <TableCell isHeader className="text-center">Status</TableCell>
                <TableCell isHeader className="text-center">Aksi</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-50">
              {filteredSops.map(sop => (
                <TableRow
                  key={sop.id}
                  className="hover:bg-blue-50/20 group transition-colors cursor-pointer"
                  onClick={() => handleView(sop.id)}
                >
                  <TableCell className="px-8 py-6">
                    <Label className="text-[11px] font-mono  text-gray-400 bg-gray-50 px-2 py-1 rounded">
                      {sop.document_number}
                    </Label>
                  </TableCell>
                  <TableCell className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                        <FileText size={18} />
                      </div>
                      <div>
                        <Link
                          href={`/dashboard/sops/${sop.id}`}
                          onMouseEnter={() => router.prefetch(`/dashboard/sops/${sop.id}`)}
                          className="text-sm font-semibold text-gray-900 leading-tight hover:text-blue-600 transition-colors uppercase block"
                        >
                          {sop.title}
                        </Link>
                        <Subtext className="text-[10px] text-gray-400 font-medium mt-1">
                          Terbit: {new Date(sop.revision_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Subtext>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <Tag size={12} className="text-gray-300" />
                      <Label className="text-[11px]  text-gray-600 uppercase ">
                        {sop.sop_categories?.name || 'Manual'}
                      </Label>
                    </div>
                  </TableCell>
                  <TableCell className="px-8 py-6 text-center">
                    <Label className="text-[11px]  text-gray-500">
                      Rev {String(sop.revision_number).padStart(2, '0')}
                    </Label>
                  </TableCell>
                  <TableCell className="px-8 py-6 text-center">
                    <Label className={`px-3 py-1 rounded-full text-[9px]  uppercase  border ${sop.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                      {sop.status}
                    </Label>
                  </TableCell>
                  <TableCell className="px-8 py-6 text-center">
                    <div className="flex items-center justify-center gap-2 transition-all">
                      <ActionButton
                        icon={Eye}
                        variant="blue"
                        href={`/dashboard/sops/${sop.id}`}
                        title="Lihat Detail"
                      />
                      <ChevronRight size={16} className="text-gray-300" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredSops.length === 0 && (
            <div className="py-32 text-center">
              <BookOpen size={48} className="mx-auto mb-4 opacity-5 text-gray-400" />
              <Subtext className="text-[10px]  uppercase tracking-[0.2em] text-gray-300 italic">
                Tidak ada dokumen SOP ditemukan
              </Subtext>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
