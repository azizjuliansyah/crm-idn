'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { Button, Table, TableHeader, TableBody, TableRow, TableCell, Subtext, Label, SearchInput, Checkbox, H2, Toast, ToastType } from '@/components/ui';


import { supabase } from '@/lib/supabase';
import { Company, ClientCompany, ClientCompanyCategory } from '@/lib/types';
import {
  Plus, Search, Edit2, Trash2, Loader2, Factory,
  MapPin, Mail, Phone, ChevronRight, X, Save, Tags,
  ArrowUpDown, ChevronUp, ChevronDown, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { ConfirmBulkDeleteModal } from '@/components/shared/modals/ConfirmBulkDeleteModal';
// Removed legacy NotificationModal import
import { ClientCompanyFormModal } from './components/ClientCompanyFormModal';

interface Props {
  company: Company;
}

type SortKey = 'name' | 'category' | 'email' | 'id';
type SortConfig = { key: SortKey; direction: 'asc' | 'desc' } | null;

export const ClientCompaniesView: React.FC<Props> = ({ company }) => {
  const searchParams = useSearchParams();
  const [rawItems, setRawItems] = useState<ClientCompany[]>([]);
  const [categories, setCategories] = useState<ClientCompanyCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id', direction: 'desc' });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Custom Modal States
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null; name: string }>({ isOpen: false, id: null, name: '' });
  const [isConfirmBulkOpen, setIsConfirmBulkOpen] = useState(false);
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
    isOpen: false,
    message: '',
    type: 'success',
  });

  const [form, setForm] = useState<Partial<ClientCompany>>({
    name: '', category_id: null, address: '', email: '', whatsapp: ''
  });

  const fetchData = useCallback(async (isInitial = false) => {
    if (!company?.id) {
      setLoading(false);
      return;
    }
    if (isInitial) setLoading(true);
    try {
      const [cosRes, catsRes] = await Promise.all([
        supabase.from('client_companies').select('*').eq('company_id', company.id).order('name'),
        supabase.from('client_company_categories').select('*').eq('company_id', company.id).order('name')
      ]);

      if (cosRes.error) throw cosRes.error;
      if (catsRes.error) throw catsRes.error;

      if (cosRes.data) setRawItems(cosRes.data as any);
      if (catsRes.data) setCategories(catsRes.data);
      setSelectedIds([]);
    } catch (err) {
      console.error("Fetch Data Error:", err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    const success = searchParams.get('success');
    if (success) {
      setToast({ isOpen: true, message: 'Data Berhasil Disimpan', type: 'success' });

      // Clean up the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
    }
  }, [searchParams]);

  const items = useMemo(() => {
    let result = rawItems.map(item => ({
      ...item,
      client_company_categories: categories.find(cat => cat.id === item.category_id)
    }));

    if (searchTerm) {
      result = result.filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.client_company_categories?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sortConfig) {
      result.sort((a, b) => {
        let valA: any, valB: any;
        switch (sortConfig.key) {
          case 'name': valA = a.name; valB = b.name; break;
          case 'category': valA = a.client_company_categories?.name || ''; valB = b.client_company_categories?.name || ''; break;
          case 'email': valA = a.email || ''; valB = b.email || ''; break;
          default: valA = a.id; valB = b.id;
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [rawItems, categories, searchTerm, sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) setSelectedIds([]);
    else setSelectedIds(items.map(i => i.id));
  };

  const showNotification = (message: string, type: ToastType = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('client_companies').delete().in('id', selectedIds);
      if (error) throw error;
      await fetchData();
      setIsConfirmBulkOpen(false);
      showNotification(`Berhasil menghapus ${selectedIds.length} data perusahaan.`);
    } catch (err: any) {
      showNotification(err.message || "Beberapa data tidak dapat dihapus karena masih terhubung dengan data lain.", 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickAddCategory = async (newCatName: string) => {
    try {
      const { data, error } = await supabase
        .from('client_company_categories')
        .insert({ name: newCatName, company_id: company.id })
        .select()
        .single();
      if (error) throw error;

      const { data: freshCats } = await supabase
        .from('client_company_categories')
        .select('*')
        .eq('company_id', company.id)
        .order('name');

      if (freshCats) setCategories(freshCats);
      return data;
    } catch (err: any) {
      showNotification(err.message, 'error');
      return null;
    }
  };

  const handleSave = async (formData: Partial<ClientCompany>) => {
    if (!formData.name || !formData.category_id || !formData.address) {
      showNotification("Harap isi field wajib (Nama, Kategori, Alamat).", 'error');
      return;
    }
    setIsProcessing(true);
    try {
      const payload = {
        name: formData.name,
        category_id: formData.category_id,
        address: formData.address,
        email: formData.email,
        whatsapp: formData.whatsapp,
        company_id: company.id
      };
      if (formData.id) await supabase.from('client_companies').update(payload).eq('id', formData.id);
      else await supabase.from('client_companies').insert(payload);
      setIsModalOpen(false);
      await fetchData();
      showNotification(`Data perusahaan ${formData.name} berhasil diperbarui.`);
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('client_companies').delete().eq('id', confirmDelete.id);
      if (error) throw error;
      await fetchData();
      setConfirmDelete({ isOpen: false, id: null, name: '' });
      showNotification(`Data perusahaan ${confirmDelete.name} telah dihapus.`);
    } catch (err: any) {
      showNotification("Data tidak dapat dihapus karena masih memiliki Client yang terhubung. Hapus client terlebih dahulu.", 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortConfig?.key !== col) return <ArrowUpDown size={12} className="ml-1 opacity-20" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={12} className="ml-1 text-indigo-600" /> : <ChevronDown size={12} className="ml-1 text-indigo-600" />;
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-indigo-600 mb-4" /><Subtext className="text-[10px]  uppercase  text-gray-400">Mensinkronisasi Data Perusahaan...</Subtext></div>;

  return (
    <div className="flex flex-col gap-6 text-gray-900">
      <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <H2 className="text-xl">Perusahaan Client</H2>
            <Subtext className="text-[10px] uppercase ">Kelola daftar nama perusahaan dan instansi.</Subtext>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => { setForm({ name: '', category_id: null, address: '', email: '', whatsapp: '' }); setIsModalOpen(true); }}
              leftIcon={<Plus size={14} strokeWidth={3} />}
              className="!px-6 py-2.5 text-[10px] uppercase  shadow-lg shadow-blue-100"
              variant="primary"
              size="sm"
            >
              Perusahaan Baru
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-50">
          <div className="w-[400px] shrink-0">
            <SearchInput
              placeholder="Cari perusahaan..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-auto">
            {selectedIds.length > 0 && (
              <Button
                onClick={() => setIsConfirmBulkOpen(true)}
                className="px-4 py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-[10px] uppercase  flex items-center gap-2 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
              >
                <Trash2 size={14} /> Hapus {selectedIds.length} Item
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm h-[80vh] mb-4 flex flex-col overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
          <Table className="w-full text-left border-collapse">
            <TableHeader className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm">
              <TableRow>
                <TableCell isHeader className="px-6 py-5 border-b border-gray-100 w-12 text-center">
                  <Checkbox
                    checked={selectedIds.length > 0 && selectedIds.length === items.length}
                    onChange={toggleSelectAll}
                    variant="indigo"
                  />
                </TableCell>
                <TableCell isHeader onClick={() => handleSort('name')} className="cursor-pointer group">
                  <div className="flex items-center">Nama Perusahaan <SortIcon col="name" /></div>
                </TableCell>
                <TableCell isHeader onClick={() => handleSort('category')} className="cursor-pointer group">
                  <div className="flex items-center">Kategori <SortIcon col="category" /></div>
                </TableCell>
                <TableCell isHeader>Kontak</TableCell>
                <TableCell isHeader className="text-center">Aksi</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-50">
              {items.map(item => (
                <TableRow key={item.id} className={`hover:bg-gray-50/30 group transition-colors ${selectedIds.includes(item.id) ? 'bg-indigo-50/30' : ''}`}>
                  <TableCell className="px-6 py-4 text-center">
                    <Checkbox
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      variant="indigo"
                    />
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center"><Factory size={20} /></div>
                      <div>
                        <Subtext className="text-sm text-gray-900 ">{item.name}</Subtext>
                        <Subtext className="text-[10px] text-gray-400 uppercase mt-1 flex items-center gap-1 "><MapPin size={10} /> {item.address || '-'}</Subtext>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Label className="px-3 py-1 bg-white border border-gray-100 rounded-full text-[9px]  uppercase  text-gray-500 shadow-sm">
                      {item.client_company_categories?.name || 'N/A'}
                    </Label>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="space-y-1">
                      <Subtext className="text-[10px] text-gray-600 flex items-center gap-2 "><Mail size={12} className="text-gray-300" /> {item.email || '-'}</Subtext>
                      <Subtext className="text-[10px] text-gray-600 flex items-center gap-2 "><Phone size={12} className="text-gray-300" /> {item.whatsapp || '-'}</Subtext>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <ActionButton icon={Edit2} variant="blue" onClick={() => { setForm(item); setIsModalOpen(true); }} title="Edit" />
                      <ActionButton icon={Trash2} variant="rose" onClick={() => setConfirmDelete({ isOpen: true, id: item.id, name: item.name })} title="Hapus" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-24 text-center text-gray-300  uppercase text-[10px]  italic opacity-30">Tidak ada data perusahaan</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ClientCompanyFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave as any}
        form={form}
        setForm={setForm}
        isProcessing={isProcessing}
        categories={categories}
        companyId={company.id}
        onQuickAddCategory={handleQuickAddCategory}
      />

      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
        onConfirm={executeDelete}
        itemName={confirmDelete.name}
        description="Tindakan ini permanen. Pastikan tidak ada data client yang masih terhubung dengan perusahaan ini sebelum menghapus."
        isProcessing={isProcessing}
        variant="horizontal"
      />

      <ConfirmBulkDeleteModal
        isOpen={isConfirmBulkOpen}
        onClose={() => setIsConfirmBulkOpen(false)}
        onConfirm={handleBulkDelete}
        count={selectedIds.length}
        description={`Apakah Anda yakin ingin menghapus ${selectedIds.length} perusahaan yang dipilih secara permanen?`}
        isProcessing={isProcessing}
        variant="horizontal"
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
