'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, ClientCompanyCategory, ClientCompany } from '@/lib/types';
import { 
  Plus, Search, Edit2, Trash2, Loader2, Tags, 
  Save, AlertTriangle, List, Building2, CheckCircle2, X
} from 'lucide-react';

import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { NotificationModal } from '@/components/shared/modals/NotificationModal';
import { ClientCompanyCategoryFormModal } from './components/ClientCompanyCategoryFormModal';

interface Props {
  company: Company;
}

export const ClientCompanyCategoriesSettingsView: React.FC<Props> = ({ company }) => {
  const [categories, setCategories] = useState<ClientCompanyCategory[]>([]);
  const [clientCompanies, setClientCompanies] = useState<ClientCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [form, setForm] = useState<Partial<ClientCompanyCategory>>({
    name: ''
  });

  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null; name: string }>({ isOpen: false, id: null, name: '' });
  const [notification, setNotification] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' }>({ 
    isOpen: false, title: '', message: '', type: 'success' 
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: catsData } = await supabase
        .from('client_company_categories')
        .select('*')
        .eq('company_id', company.id)
        .order('name');
      
      const { data: cosData } = await supabase
        .from('client_companies')
        .select('id, category_id')
        .eq('company_id', company.id);

      if (catsData) setCategories(catsData);
      if (cosData) setClientCompanies(cosData as ClientCompany[]);
    } finally {
      setLoading(false);
    }
  }, [company.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const categoriesWithCounts = useMemo(() => {
    return categories.map(cat => {
      const count = clientCompanies.filter(co => co.category_id === cat.id).length;
      return { ...cat, company_count: count };
    });
  }, [categories, clientCompanies]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    setIsProcessing(true);
    try {
      if (form.id) {
        await supabase.from('client_company_categories').update({ name: form.name }).eq('id', form.id);
      } else {
        await supabase.from('client_company_categories').insert({ name: form.name, company_id: company.id });
      }
      setIsModalOpen(false);
      fetchData();
      setNotification({ isOpen: true, title: 'Berhasil', message: 'Kategori telah disimpan.', type: 'success' });
    } catch (err: any) {
      setNotification({ isOpen: true, title: 'Gagal', message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteClick = (cat: ClientCompanyCategory) => {
    setConfirmDelete({ isOpen: true, id: cat.id, name: cat.name });
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('client_company_categories').delete().eq('id', confirmDelete.id);
      if (error) throw error;
      setConfirmDelete({ isOpen: false, id: null, name: '' });
      fetchData();
    } catch (err: any) {
      setNotification({ isOpen: true, title: 'Gagal Menghapus', message: 'Kategori tidak dapat dihapus karena masih digunakan oleh data perusahaan.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-blue-600 mb-4" /><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Memuat Kategori...</p></div>;

  return (
    <div className="max-w-3xl space-y-8">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-10 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 tracking-tighter">Kategori Perusahaan Client</h3>
            <p className="text-sm text-gray-400 font-medium mt-1">Kelola kategori untuk mengelompokkan klien bisnis Anda.</p>
          </div>
          <button 
            onClick={() => { setForm({ name: '' }); setIsModalOpen(true); }}
            className="px-6 py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center gap-2 hover:bg-indigo-700 transition-all active:scale-95"
          >
            <Plus size={16} /> Kategori Baru
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-10 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nama Kategori</th>
                <th className="px-10 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Jumlah Perusahaan</th>
                <th className="px-10 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categoriesWithCounts.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/30 group">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                        <Tags size={16} />
                      </div>
                      <span className="text-sm font-bold text-gray-900 tracking-tight">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-50 border border-gray-100 rounded-full">
                        <Building2 size={12} className="text-gray-400" />
                        <span className="text-[10px] font-bold text-indigo-600 uppercase">
                            {item.company_count} Perusahaan
                        </span>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setForm(item); setIsModalOpen(true); }} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeleteClick(item)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {categoriesWithCounts.length === 0 && (
            <div className="py-20 text-center text-gray-300">
               <Tags size={48} className="mx-auto mb-4 opacity-10" />
               <p className="text-xs font-bold uppercase tracking-widest">Belum ada kategori yang ditambahkan</p>
            </div>
          )}
        </div>
      </div>

      <ClientCompanyCategoryFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave as any}
        form={form}
        setForm={setForm}
        isProcessing={isProcessing}
      />

      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
        onConfirm={executeDelete}
        itemName={confirmDelete.name}
        description="Seluruh data perusahaan yang terhubung dengan kategori ini akan kehilangan referensinya."
        isProcessing={isProcessing}
      />

      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </div>
  );
};
