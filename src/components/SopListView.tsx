'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, Sop, SopCategory } from '@/lib/types';
import { 
  Plus, Search, FileText, Loader2, BookOpen, 
  ChevronRight, ArrowUpDown, Clock, Tag, Archive, Edit, Eye, Trash2
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  company: Company;
  categoryId?: number;
  isArchive?: boolean;
}

export const SopListView: React.FC<Props> = ({ company, categoryId, isArchive }) => {
  const router = useRouter();
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
      if (data) setSops(data as any);
    } finally {
      setLoading(false);
    }
  }, [company.id, categoryId, isArchive]);

  useEffect(() => {
    fetchSops();
  }, [fetchSops]);

  const filteredSops = sops.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.document_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleView = (id: number) => {
    router.push(`/dashboard/sops/${id}`);
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-blue-600 mb-4" /><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sinkronisasi Dokumen...</p></div>;

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-in fade-in duration-300">
        <div className="relative min-w-[300px] max-w-[400px] flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
          <input 
            type="text" 
            placeholder="Cari berdasarkan nomor atau judul SOP..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl outline-none focus:bg-white transition-all text-[11px] font-bold" 
          />
        </div>
        {!isArchive && (
          <button 
            onClick={() => router.push('/dashboard/sops/create')}
            className="px-6 py-3.5 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus size={14} /> Buat SOP Baru
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex-1 overflow-y-auto custom-scrollbar">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-md">
            <tr>
              <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">No. Dokumen</th>
              <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Judul Prosedur</th>
              <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Kategori / Divisi</th>
              <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Revisi</th>
              <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Status</th>
              <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredSops.map(sop => (
              <tr 
                key={sop.id} 
                className="hover:bg-blue-50/20 group transition-colors cursor-pointer"
                onClick={() => handleView(sop.id)}
              >
                <td className="px-8 py-6">
                  <span className="text-[11px] font-mono font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded">
                    {sop.document_number}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                      <FileText size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 tracking-tight leading-tight group-hover:text-blue-600 transition-colors uppercase">
                        {sop.title}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium mt-1">
                        Terbit: {new Date(sop.revision_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2">
                    <Tag size={12} className="text-gray-300" />
                    <span className="text-[11px] font-bold text-gray-600 uppercase tracking-tight">
                      {sop.sop_categories?.name || 'Manual'}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-6 text-center">
                  <span className="text-[11px] font-bold text-gray-500">
                    Rev {String(sop.revision_number).padStart(2, '0')}
                  </span>
                </td>
                <td className="px-8 py-6 text-center">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-tighter border ${
                    sop.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                  }`}>
                    {sop.status}
                  </span>
                </td>
                <td className="px-8 py-6 text-center">
                  <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleView(sop.id); }}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                      title="Lihat Detail"
                    >
                      <Eye size={16} />
                    </button>
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredSops.length === 0 && (
          <div className="py-32 text-center">
             <BookOpen size={48} className="mx-auto mb-4 opacity-5 text-gray-400" />
             <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300 italic">
               Tidak ada dokumen SOP ditemukan
             </p>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
};
