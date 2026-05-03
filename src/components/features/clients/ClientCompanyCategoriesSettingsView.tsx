'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { Button, Table, TableHeader, TableBody, TableRow, TableCell, H2, Subtext, Label, Toast, ToastType } from '@/components/ui';


import { supabase } from '@/lib/supabase';
import { Company, ClientCompanyCategory, ClientCompany } from '@/lib/types';
import {
  Plus, Search, Edit2, Trash2, Loader2, Tags,
  Save, AlertTriangle, List, Building2, CheckCircle2, X, ArrowUp, ArrowDown
} from 'lucide-react';

import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
// Removed legacy NotificationModal import
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
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
    isOpen: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
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
      if (isInitial) setLoading(false);
    }
  }, [company.id]);

  useEffect(() => {
    fetchData(true);
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
        const { error } = await supabase.from('client_company_categories').update({ name: form.name }).eq('id', form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('client_company_categories').insert({ name: form.name, company_id: company.id });
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchData();
      showToast('Kategori telah disimpan.');
    } catch (err: any) {
      showToast(err.message, 'error');
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
      showToast('Kategori tidak dapat dihapus karena masih digunakan oleh data perusahaan.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-blue-600 mb-4" /><Subtext className="text-[10px]  uppercase  text-gray-400">Memuat Kategori...</Subtext></div>;

  return (
    <div className="max-w-4xl flex flex-col space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border-2 border-gray-300 shadow-none shrink-0">
        <div>
          <H2 className="text-xl ">Kategori Client</H2>
          <Subtext className="text-[10px] uppercase font-semibold text-gray-400">Kelola kategori untuk mengelompokkan klien bisnis Anda.</Subtext>
        </div>
        <Button
          onClick={() => { setForm({ name: '' }); setIsModalOpen(true); }}
          leftIcon={<Plus size={14} strokeWidth={3} />}
          variant='primary'
          size='sm'
          className="shadow-none"
        >
          Kategori Baru
        </Button>
      </div>

      <div className="bg-white rounded-2xl border-2 border-gray-300 shadow-none overflow-hidden">

        <div className="overflow-x-auto">
          <Table className="w-full text-left">
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableCell isHeader>Nama Kategori</TableCell>
                <TableCell isHeader className="text-center">Jumlah Perusahaan</TableCell>
                <TableCell isHeader className="text-center">Aksi</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-50">
              {categoriesWithCounts.map(item => (
                <TableRow key={item.id} className="hover:bg-gray-50/30 group">
                  <TableCell className="px-10 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                        <Tags size={16} />
                      </div>
                      <Label className="text-sm text-gray-900 ">{item.name}</Label>
                    </div>
                  </TableCell>
                  <TableCell className="px-10 py-6 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-50 border border-gray-100 rounded-full">
                      <Building2 size={12} className="text-gray-400" />
                      <Label className="text-[10px]  text-indigo-600 uppercase">
                        {item.company_count} Perusahaan
                      </Label>
                    </div>
                  </TableCell>
                  <TableCell className="px-10 py-6 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <ActionButton
                        icon={Edit2}
                        variant="blue"
                        onClick={() => { setForm(item); setIsModalOpen(true); }}
                      />
                      <ActionButton
                        icon={Trash2}
                        variant="rose"
                        onClick={() => handleDeleteClick(item)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {categoriesWithCounts.length === 0 && (
            <div className="py-20 text-center text-gray-300">
              <Tags size={48} className="mx-auto mb-4 opacity-10" />
              <Subtext className="text-xs  uppercase ">Belum ada kategori yang ditambahkan</Subtext>
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

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
