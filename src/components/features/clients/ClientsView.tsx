'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { Button, Table, TableHeader, TableBody, TableRow, TableCell, Subtext, Label, SearchInput, Checkbox, H2, Toast, ToastType } from '@/components/ui';


import { supabase } from '@/lib/supabase';
import { Company, Client, ClientCompany, ClientCompanyCategory } from '@/lib/types';
import {
  Plus, Search, Edit2, Trash2, Loader2, Contact,
  MapPin, Mail, Phone, ChevronRight, X, Save, Building, Tags, Info,
  ChevronUp, ChevronDown, AlertTriangle, ArrowUpDown, CheckCircle2
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { ConfirmBulkDeleteModal } from '@/components/shared/modals/ConfirmBulkDeleteModal';
// Removed legacy NotificationModal import
import { ClientFormModal } from './components/ClientFormModal';

interface Props {
  company: Company;
}

type SortKey = 'name' | 'company' | 'email' | 'whatsapp' | 'id';
type SortConfig = { key: SortKey; direction: 'asc' | 'desc' } | null;

export const ClientsView: React.FC<Props> = ({ company }) => {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Client[]>([]);
  const [rawCompanies, setRawCompanies] = useState<ClientCompany[]>([]);
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

  const [form, setForm] = useState<Partial<Client>>({
    salutation: '', name: '', client_company_id: null, email: '', whatsapp: ''
  });

  const fetchData = useCallback(async (isInitial = false) => {
    if (!company?.id) {
      setLoading(false);
      return;
    }
    if (isInitial) setLoading(true);
    try {
      const [clientsRes, cosRes, catsRes] = await Promise.all([
        supabase.from('clients').select('*').eq('company_id', company.id).order('id', { ascending: false }),
        supabase.from('client_companies').select('*').eq('company_id', company.id).order('name'),
        supabase.from('client_company_categories').select('*').eq('company_id', company.id).order('name')
      ]);

      if (clientsRes.data) setItems(clientsRes.data);
      if (cosRes.data) setRawCompanies(cosRes.data);
      if (catsRes.data) setCategories(catsRes.data);
      setSelectedIds([]);
    } catch (error) {
      console.error("Fetch Data Error:", error);
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

  const clientCompanies = useMemo(() => {
    return rawCompanies.map(co => ({
      ...co,
      client_company_categories: categories.find(cat => cat.id === co.category_id)
    }));
  }, [rawCompanies, categories]);

  const clientsWithData = useMemo(() => {
    let result = items.map(item => ({
      ...item,
      client_company: clientCompanies.find(co => co.id === item.client_company_id)
    }));

    if (searchTerm) {
      result = result.filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.client_company?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sortConfig) {
      result.sort((a, b) => {
        let valA: any, valB: any;

        switch (sortConfig.key) {
          case 'name': valA = a.name; valB = b.name; break;
          case 'company': valA = a.client_company?.name || ''; valB = b.client_company?.name || ''; break;
          case 'email': valA = a.email || ''; valB = b.email || ''; break;
          case 'whatsapp': valA = a.whatsapp || ''; valB = b.whatsapp || ''; break;
          default: valA = a.id; valB = b.id;
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [items, clientCompanies, searchTerm, sortConfig]);

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
    if (selectedIds.length === clientsWithData.length) setSelectedIds([]);
    else setSelectedIds(clientsWithData.map(i => i.id));
  };

  const showNotification = (message: string, type: ToastType = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('clients').delete().in('id', selectedIds);
      if (error) throw error;
      await fetchData();
      setIsConfirmBulkOpen(false);
      showNotification(`Berhasil menghapus ${selectedIds.length} data client.`);
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickAddCatInCo = async (newCatName: string) => {
    try {
      const { data, error } = await supabase
        .from('client_company_categories')
        .insert({ name: newCatName, company_id: company.id })
        .select()
        .single();

      if (error) throw error;
      setCategories(prev => [...prev, data as any].sort((a, b) => a.name.localeCompare(b.name)));
      return data;
    } catch (err: any) {
      showNotification(err.message, 'error');
      return null;
    }
  };

  const handleQuickAddCo = async (newCoData: any) => {
    try {
      const { data, error } = await supabase
        .from('client_companies')
        .insert(newCoData)
        .select('*')
        .single();

      if (error) throw error;
      setRawCompanies(prev => [...prev, data as any].sort((a, b) => a.name.localeCompare(b.name)));
      return data;
    } catch (err: any) {
      showNotification(err.message, 'error');
      return null;
    }
  };

  const handleSave = async (formData: Partial<Client>) => {
    if (!formData.name) {
      showNotification('Silakan masukkan nama client.', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      const payload = {
        salutation: formData.salutation,
        name: formData.name,
        client_company_id: formData.client_company_id ? Number(formData.client_company_id) : null,
        email: formData.email,
        whatsapp: formData.whatsapp,
        company_id: company.id
      };

      if (formData.id) {
        await supabase.from('clients').update(payload).eq('id', formData.id);
      } else {
        await supabase.from('clients').insert(payload);
      }
      setIsModalOpen(false);
      await fetchData();
      showNotification(`Profil ${formData.name} telah diperbarui.`, 'success');
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
      const { error } = await supabase.from('clients').delete().eq('id', confirmDelete.id);
      if (error) throw error;
      await fetchData();
      setConfirmDelete({ isOpen: false, id: null, name: '' });
      showNotification(`Data client ${confirmDelete.name} telah dihapus.`);
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortConfig?.key !== col) return <ArrowUpDown size={12} className="ml-1 opacity-20" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={12} className="ml-1 text-blue-600" /> : <ChevronDown size={12} className="ml-1 text-blue-600" />;
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-emerald-600 mb-4" /><Subtext className="text-[10px]  uppercase  text-gray-400">Mensinkronisasi Data Client...</Subtext></div>;

  return (
    <div className="flex flex-col gap-6 text-gray-900">
      <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <H2 className="text-xl">Kontak Client</H2>
            <Subtext className="text-[10px] uppercase ">Kelola daftar kontak person client.</Subtext>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                setForm({ salutation: '', name: '', client_company_id: null, email: '', whatsapp: '' });
                setIsModalOpen(true);
              }}
              leftIcon={<Plus size={14} strokeWidth={3} />}
              className="!px-6 py-2.5 text-[10px] uppercase  shadow-lg shadow-emerald-100"
              variant="success"
              size="sm"
            >
              Client Baru
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-50">
          <div className="w-[400px] shrink-0">
            <SearchInput
              placeholder="Cari client atau perusahaan..."
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
                <Trash2 size={14} /> Hapus {selectedIds.length} Client
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
                    checked={selectedIds.length > 0 && selectedIds.length === clientsWithData.length}
                    onChange={toggleSelectAll}
                    variant="emerald"
                  />
                </TableCell>
                <TableCell isHeader onClick={() => handleSort('name')} className="cursor-pointer group">
                  <div className="flex items-center">Client / Kontak <SortIcon col="name" /></div>
                </TableCell>
                <TableCell isHeader onClick={() => handleSort('company')} className="cursor-pointer group">
                  <div className="flex items-center">Perusahaan <SortIcon col="company" /></div>
                </TableCell>
                <TableCell isHeader>Kontak Detail</TableCell>
                <TableCell isHeader className="text-center">Aksi</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-50">
              {clientsWithData.map(item => (
                <TableRow key={item.id} className={`hover:bg-gray-50/30 group transition-colors ${selectedIds.includes(item.id) ? 'bg-emerald-50/30' : ''}`}>
                  <TableCell className="px-6 py-4 text-center">
                    <Checkbox
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      variant="emerald"
                    />
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center  text-[10px]">
                        {item.name.charAt(0)}
                      </div>
                      <div>
                        <Subtext className="text-sm text-gray-900 ">
                          {item.salutation && <Label className="text-emerald-500 mr-1 ">{item.salutation}</Label>}
                          {item.name}
                        </Subtext>
                        <Subtext className="text-[10px] text-gray-500 font-mono mt-1 ">#{String(item.id).padStart(4, '0')}</Subtext>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {item.client_company ? (
                      <div className="flex items-center gap-2">
                        <Building size={12} className="text-indigo-400" />
                        <Label className="text-[11px]  text-indigo-600 uppercase ">{item.client_company.name}</Label>
                      </div>
                    ) : (
                      <Label className="text-[9px]  uppercase  text-gray-300 italic">Personal</Label>
                    )}
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
              {clientsWithData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-24 text-center">
                    <Contact size={48} className="mx-auto mb-4 opacity-10 text-gray-400" />
                    <Subtext className="text-xs  uppercase  text-gray-300">Belum ada data client</Subtext>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ClientFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        form={form}
        setForm={setForm}
        isProcessing={isProcessing}
        clientCompanies={rawCompanies}
        categories={categories}
        companyId={company.id}
        onQuickAddCompany={handleQuickAddCo}
        onQuickAddCategory={handleQuickAddCatInCo}
      />

      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
        onConfirm={executeDelete}
        itemName={`Data client ${confirmDelete.name}`}
        description="Anda akan menghapus data ini secara permanen. Seluruh riwayat transaksi yang terhubung dengan client ini mungkin terpengaruh."
        isProcessing={isProcessing}
        variant="horizontal"
      />

      <ConfirmBulkDeleteModal
        isOpen={isConfirmBulkOpen}
        onClose={() => setIsConfirmBulkOpen(false)}
        onConfirm={handleBulkDelete}
        count={selectedIds.length}
        description={`Apakah Anda yakin ingin menghapus seluruh client yang dipilih secara permanen? Tindakan ini tidak dapat dibatalkan.`}
        isProcessing={isProcessing}
        variant="horizontal"
      />

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
};
