'use client';

import React, { useState } from 'react';
import { 
  Building2, Plus, Edit2, Trash2, Loader2, Search 
} from 'lucide-react';
import { 
  Button, Table, TableHeader, TableBody, TableRow, TableCell, 
  Subtext, Avatar, Card, Toast, ToastType 
} from '@/components/ui';
import { Company, Profile, CompanyRole } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { PlatformWorkspaceFormModal } from './components/PlatformWorkspaceFormModal';
import { PlatformAccessModal } from './components/PlatformAccessModal';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';

interface AdminCompaniesViewProps {
  initialCompanies: Company[];
  allUsers: Profile[];
  allPackages: any[];
}

export const AdminCompaniesView: React.FC<AdminCompaniesViewProps> = ({ 
  initialCompanies,
  allUsers,
  allPackages 
}) => {
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCoModalOpen, setIsCoModalOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
    isOpen: false,
    message: '',
    type: 'success',
  });

  const [coForm, setCoForm] = useState({ id: null as number | null, name: '', address: '', package_id: null as number | null });
  const [memberCounts, setMemberCounts] = useState<Record<number, number>>({});
  const [pendingDelete, setPendingDelete] = useState<{ id: number | string, type: 'company' | 'user' } | null>(null);
  
  const [accessMode, setAccessMode] = useState<{ type: 'user_to_companies' | 'company_to_users', target: any }>({ type: 'company_to_users', target: null });
  const [selectedWithRoles, setSelectedWithRoles] = useState<Record<string | number, string>>({});
  const [rolesByCompany, setRolesByCompany] = useState<Record<number, CompanyRole[]>>({});
  const [accessSearchTerm, setAccessSearchTerm] = useState('');

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  const fetchData = async () => {
    const { data: coData } = await supabase.from('companies').select('*, packages(*)').order('created_at', { ascending: false });
    if (coData) setCompanies(coData as any);

    const { data: memData } = await supabase.from('company_members').select('company_id');
    if (memData) {
      const counts: Record<number, number> = {};
      memData.forEach(m => {
        counts[m.company_id] = (counts[m.company_id] || 0) + 1;
      });
      setMemberCounts(counts);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchAllRoles = async () => {
    const { data: allRoles } = await supabase.from('company_roles').select('*');
    if (allRoles) {
      const grouped = allRoles.reduce((acc: any, role) => {
        const coId = role.company_id;
        if (!acc[coId]) acc[coId] = [];
        acc[coId].push(role);
        return acc;
      }, {});
      setRolesByCompany(grouped);
      return grouped;
    }
    return {};
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coForm.name) return;
    setIsProcessing(true);
    try {
      if (coForm.id) {
        await supabase.from('companies').update({ 
          name: coForm.name, 
          address: coForm.address,
          package_id: coForm.package_id 
        }).eq('id', coForm.id);
      } else {
        const { error: coErr } = await supabase.from('companies').insert({
          name: coForm.name,
          address: coForm.address,
          package_id: coForm.package_id
        });

        if (coErr) throw coErr;
      }
      setIsCoModalOpen(false);
      fetchData();
      showToast('Workspace berhasil disimpan.');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const openAccessModal = async (target: any) => {
    setAccessMode({ type: 'company_to_users', target });
    setSelectedWithRoles({});
    setAccessSearchTerm('');
    setIsProcessing(true);
    try {
      const currentRolesGrouped = await fetchAllRoles();
      const { data } = await supabase.from('company_members').select('company_id, user_id, role_id').eq('company_id', target.id);
      if (data) {
        const mapping: Record<string | number, string> = {};
        data.forEach(d => {
          mapping[d.user_id] = d.role_id || (currentRolesGrouped[target.id]?.[0]?.id || '');
        });
        setSelectedWithRoles(mapping);
      }
      setIsAccessModalOpen(true);
    } finally { setIsProcessing(false); }
  };

  const handleToggleAccessWithRole = (id: string | number, roleId?: string) => {
    setSelectedWithRoles(prev => {
      const next = { ...prev };
      if (roleId === undefined) delete next[id];
      else next[id] = roleId;
      return next;
    });
  };

  const saveAccess = async () => {
    setIsProcessing(true);
    const target = accessMode.target;
    try {
      await supabase.from('company_members').delete().eq('company_id', target.id);
      const inserts = Object.entries(selectedWithRoles).map(([userId, roleId]) => ({ company_id: target.id, user_id: userId, role_id: roleId }));
      
      // Validation for max members
      if (target.packages) {
        const max = target.packages.max_members;
        if (inserts.length > max) {
          throw new Error(`Workspace ini memiliki limit maximal ${max} anggota berdasarkan paket yang dipilih.`);
        }
      }

      if (inserts.length > 0) await supabase.from('company_members').insert(inserts);
      setIsAccessModalOpen(false);
      showToast('Akses anggota berhasil diperbarui.');
    } catch (err: any) { showToast(err.message, 'error'); } finally { setIsProcessing(false); }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setIsProcessing(true);
    try {
      await supabase.from('companies').delete().eq('id', pendingDelete.id);
      fetchData();
    } catch (error: any) { showToast(error.message, 'error'); } finally { setIsConfirmModalOpen(false); setPendingDelete(null); setIsProcessing(false); }
  };

  const filteredItems = allUsers.filter(u => u.full_name.toLowerCase().includes(accessSearchTerm.toLowerCase()) || u.email.toLowerCase().includes(accessSearchTerm.toLowerCase()));

  return (
    <div>
      <Card
        title="Master Workspace"
        action={
          <Button
            onClick={() => { setCoForm({ id: null, name: '', address: '', package_id: null }); setIsCoModalOpen(true); }}
            size="sm"
            leftIcon={<Plus size={16} />}
          >
            Tambah
          </Button>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader>Workspace</TableCell>
              <TableCell isHeader className="text-center">Paket</TableCell>
              <TableCell isHeader className="text-center">Anggota</TableCell>
              <TableCell isHeader className="text-center">Akses</TableCell>
              <TableCell isHeader className="text-center">Aksi</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map(co => (
              <TableRow key={co.id}>
                <TableCell className="flex items-center gap-4">
                  <Avatar src={co.logo_url || ''} name={co.name} shape="square" size="lg" />
                  <div>
                    <Subtext className="">{co.name}</Subtext>
                    <Subtext className="text-[10px] font-mono text-gray-400">ID: {String(co.id).padStart(5, '0')}</Subtext>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {co.packages ? (
                    <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-600 text-[10px] font-bold">
                      {co.packages.name}
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400">Tanpa Paket</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center">
                    <span className={`text-xs font-bold ${(memberCounts[co.id] || 0) >= (co.packages?.max_members || 999) ? 'text-red-500' : 'text-gray-700'}`}>
                      {memberCounts[co.id] || 0} / {co.packages?.max_members || '-'}
                    </span>
                    <div className="w-16 h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div 
                        className={`h-full transition-all ${ (memberCounts[co.id] || 0) >= (co.packages?.max_members || 999) ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(((memberCounts[co.id] || 0) / (co.packages?.max_members || 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    onClick={() => openAccessModal(co)}
                    variant="primary"
                    size="sm"
                  >
                    Atur Anggota
                  </Button>
                </TableCell>
                <TableCell className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 text-blue-500"
                    onClick={() => { setCoForm({ id: co.id, name: co.name, address: co.address, package_id: co.package_id || null }); setIsCoModalOpen(true); }}
                  >
                    <Edit2 size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 text-red-500"
                    onClick={() => { setPendingDelete({ id: co.id, type: 'company' }); setIsConfirmModalOpen(true); }}
                  >
                    <Trash2 size={16} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <PlatformWorkspaceFormModal
        isOpen={isCoModalOpen}
        onClose={() => setIsCoModalOpen(false)}
        form={coForm}
        setForm={setCoForm}
        onSave={handleSaveCompany}
        isProcessing={isProcessing}
        allPackages={allPackages}
      />

      <PlatformAccessModal
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        accessMode={accessMode}
        searchTerm={accessSearchTerm}
        setSearchTerm={setAccessSearchTerm}
        filteredItems={filteredItems}
        selectedWithRoles={selectedWithRoles}
        rolesByCompany={rolesByCompany}
        onToggleAccessWithRole={handleToggleAccessWithRole}
        onSaveAccess={saveAccess}
        isProcessing={isProcessing}
      />

      <ConfirmDeleteModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmDelete}
        itemName="Workspace"
        description="Tindakan ini permanen. Seluruh data yang terhubung dengan entitas ini akan ikut terhapus atau kehilangan referensi."
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
