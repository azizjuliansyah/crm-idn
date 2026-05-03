'use client';

import React, { useState } from 'react';
import { 
  Package, Plus, Edit2, Trash2, Loader2, Save, X 
} from 'lucide-react';
import { 
  Button, Table, TableHeader, TableBody, TableRow, TableCell, 
  Subtext, Card, Toast, ToastType, Modal, Input 
} from '@/components/ui';
import { StandardFilterBar } from '@/components/shared/filters/StandardFilterBar';
import { ActionMenu } from '@/components/shared/ActionMenu';
import { Package as PackageType } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';

interface AdminPackagesViewProps {
  initialPackages: PackageType[];
}

export const AdminPackagesView: React.FC<AdminPackagesViewProps> = ({ 
  initialPackages 
}) => {
  const [packages, setPackages] = useState<PackageType[]>(initialPackages);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
    isOpen: false,
    message: '',
    type: 'success',
  });

  const [form, setForm] = useState({ 
    id: null as number | null, 
    name: '', 
    max_members: 1 
  });
  
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  const fetchData = async () => {
    const { data } = await supabase.from('packages').select('*').order('created_at', { ascending: false });
    if (data) setPackages(data);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || form.max_members < 1) {
      showToast('Nama dan maximal anggota harus diisi dengan benar.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      if (form.id) {
        const { error } = await supabase
          .from('packages')
          .update({ 
            name: form.name, 
            max_members: form.max_members 
          })
          .eq('id', form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('packages')
          .insert({ 
            name: form.name, 
            max_members: form.max_members 
          });
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchData();
      showToast('Paket berhasil disimpan.');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('packages')
        .delete()
        .eq('id', pendingDelete);
      if (error) throw error;
      fetchData();
      showToast('Paket berhasil dihapus.');
    } catch (error: any) { 
      showToast(error.message, 'error'); 
    } finally { 
      setIsConfirmModalOpen(false); 
      setPendingDelete(null); 
      setIsProcessing(false); 
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <StandardFilterBar
        title="Master Paket"
        subtitle={`Total ${packages.length} paket tersedia`}
        primaryAction={{
          label: "Tambah Paket",
          onClick: () => { setForm({ id: null, name: '', max_members: 1 }); setIsModalOpen(true); },
          icon: <Plus size={14} />
        }}
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader>Nama Paket</TableCell>
              <TableCell isHeader className="text-center">Max Anggota</TableCell>
              <TableCell isHeader className="text-center">Aksi</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {packages.map(pkg => (
              <TableRow key={pkg.id} className="group">
                <TableCell className="font-medium text-gray-900">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500">
                      <Package size={16} />
                    </div>
                    {pkg.name}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold">
                    {pkg.max_members} Anggota
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <ActionMenu>
                    <button
                      onClick={() => { 
                        setForm({ id: pkg.id, name: pkg.name, max_members: pkg.max_members }); 
                        setIsModalOpen(true); 
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 flex items-center gap-2 transition-colors"
                    >
                      <Edit2 size={14} />
                      Edit Paket
                    </button>
                    <button
                      onClick={() => { 
                        setPendingDelete(pkg.id); 
                        setIsConfirmModalOpen(true); 
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                    >
                      <Trash2 size={14} />
                      Hapus Paket
                    </button>
                  </ActionMenu>
                </TableCell>
              </TableRow>
            ))}
            {packages.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-10 text-gray-400">
                  Belum ada paket yang dibuat.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={form.id ? "Edit Paket" : "Tambah Paket"}
      >
        <form onSubmit={handleSave} className="space-y-6">
          <Input 
            label="Nama Paket"
            placeholder="Contoh: Basic, Pro, Enterprise"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input 
            label="Maximal Anggota"
            type="number"
            min={1}
            value={form.max_members}
            onChange={e => setForm({ ...form, max_members: parseInt(e.target.value) || 0 })}
            required
          />
          <div className="flex gap-3">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setIsModalOpen(false)}
              className="flex-1"
            >
              Batal
            </Button>
            <Button 
              type="submit" 
              isLoading={isProcessing}
              className="flex-1"
              variant='primary'
              leftIcon={<Save size={18} />}
            >
              Simpan Paket
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDeleteModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmDelete}
        itemName="Paket"
        description="Tindakan ini permanen. Seluruh workspace yang menggunakan paket ini mungkin akan kehilangan referensi paketnya."
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
