import React, { useState, useEffect } from 'react';
import { Input, Button, H2, Subtext, Label, SearchInput, DateFilterDropdown, ComboBox, Toast, ToastType } from '@/components/ui';

import { supabase } from '@/lib/supabase';
import { Company, CompanyMember, LeadStage, Lead, ClientCompany, ClientCompanyCategory, LeadSource, Profile } from '@/lib/types';
import { Plus, Search, LayoutGrid, List } from 'lucide-react';
import { LeadAddModal } from './LeadAddModal';
import { LeadDetailModal } from './LeadDetailModal';
import { ConvertLeadModal } from './ConvertLeadModal';
import { LeadsTableView } from './LeadsTableView';
import { LeadsKanbanView } from './LeadsKanbanView';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';


interface Props {
  activeCompany: Company | null;
  activeView: string;
  user: Profile;
}

export const LeadsView: React.FC<Props> = ({ activeCompany, activeView, user }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('table');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, id: number | null }>({ isOpen: false, id: null });

  // Auxiliary Data
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [clientCompanies, setClientCompanies] = useState<ClientCompany[]>([]);
  const [categories, setCategories] = useState<ClientCompanyCategory[]>([]);

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [dateFilterType, setDateFilterType] = useState<string>('all');

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
    isOpen: false,
    message: '',
    type: 'success',
  });

  // Format IDR
  const formatIDR = (value?: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const fetchData = async () => {
    if (!activeCompany) return;
    setLoading(true);
    try {
      const [
        stagesRes,
        sourcesRes,
        cosRes,
        catsRes,
        membersRes,
        leadsRes
      ] = await Promise.all([
        supabase.from('lead_stages').select('*').eq('company_id', activeCompany.id).order('sort_order'),
        supabase.from('lead_sources').select('*').eq('company_id', activeCompany.id).order('name'),
        supabase.from('client_companies').select('*').eq('company_id', activeCompany.id).order('name'),
        supabase.from('client_company_categories').select('*').eq('company_id', activeCompany.id).order('name'),
        supabase.from('company_members').select(`
          *,
          profile:profiles!inner(id, full_name, avatar_url, email),
          role:company_roles(name)
        `).eq('company_id', activeCompany.id),
        supabase.from('leads').select(`
          *,
          client_company:client_companies(name),
          sales_profile:profiles!leads_sales_id_fkey(full_name, avatar_url, email)
        `).eq('company_id', activeCompany.id).order('kanban_order', { ascending: true }).order('created_at', { ascending: false })
      ]);

      if (stagesRes.data) setStages(stagesRes.data);
      if (sourcesRes.data) setSources(sourcesRes.data);
      if (cosRes.data) setClientCompanies(cosRes.data);
      if (catsRes.data) setCategories(catsRes.data);
      if (membersRes.data) setMembers(membersRes.data);
      if (leadsRes.data) setLeads(leadsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeCompany]);

  const handleCreateSuccess = () => {
    setIsAddModalOpen(false);
    fetchData();
    setToast({
      isOpen: true,
      message: 'Lead baru berhasil didaftarkan!',
      type: 'success'
    });
  };

  const handleUpdate = () => {
    fetchData();
    setToast({
      isOpen: true,
      message: 'Perubahan berhasil disimpan!',
      type: 'success'
    });
  };

  const handleDelete = (id: number) => {
    setConfirmDelete({ isOpen: true, id });
  };

  const executeDelete = async () => {
    try {
      await supabase.from('leads').delete().eq('id', confirmDelete.id);
      fetchData();
      setToast({
        isOpen: true,
        message: 'Lead berhasil dihapus!',
        type: 'success'
      });
      if (selectedLead?.id === confirmDelete.id) setSelectedLead(null);
      setConfirmDelete({ isOpen: false, id: null });
    } catch (error: any) {
      setToast({
        isOpen: true,
        message: 'Gagal menghapus lead: ' + error.message,
        type: 'error'
      });
    }
  };

  const handleToggleUrgency = async (id: number, current: boolean) => {
    try {
      const { error } = await supabase.from('leads').update({ is_urgent: !current }).eq('id', id);
      if (error) throw error;
      setLeads(prev => prev.map(l => l.id === id ? { ...l, is_urgent: !current } : l));
      setToast({
        isOpen: true,
        message: !current ? 'Lead ditandai sebagai urgent!' : 'Status urgent dihapus.',
        type: 'success'
      });
    } catch (error: any) {
      setToast({
        isOpen: true,
        message: 'Gagal mengubah status urgensi: ' + error.message,
        type: 'error'
      });
    }
  };

  const handleSort = (key: any) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredLeads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLeads.map(l => l.id));
    }
  };

  // Filter Logic
  const filteredLeads = leads.filter(lead => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.client_company?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesAssignee = assigneeFilter === 'all' || lead.sales_id === assigneeFilter;

    const leadDate = lead.input_date || lead.created_at.split('T')[0];
    let matchesDate = true;
    if (dateFilterType === 'custom') {
      matchesDate = (!startDateFilter || leadDate >= startDateFilter) && (!endDateFilter || leadDate <= endDateFilter);
    } else if (dateFilterType !== 'all') {
      const daysAgo = parseInt(dateFilterType);
      const filterDate = new Date();
      filterDate.setDate(filterDate.getDate() - daysAgo);
      matchesDate = leadDate >= filterDate.toISOString().split('T')[0];
    }

    return matchesSearch && matchesStatus && matchesAssignee && matchesDate;
  }).sort((a, b) => {
    // Priority 1: Urgency
    if (a.is_urgent && !b.is_urgent) return -1;
    if (!a.is_urgent && b.is_urgent) return 1;

    // Priority 2: Custom Sort
    if (!sortConfig) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    const valA = (a as any)[sortConfig.key];
    const valB = (b as any)[sortConfig.key];

    if (valA === valB) return 0;
    if (valA === null || valA === undefined) return 1;
    if (valB === null || valB === undefined) return -1;

    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Group by status for Kanban
  const leadsByStatus = stages.reduce((acc, stage) => {
    acc[stage.name.toLowerCase()] = filteredLeads
      .filter(l => l.status === stage.name.toLowerCase())
      .sort((a, b) => {
        const orderA = a.kanban_order || 0;
        const orderB = b.kanban_order || 0;
        if (orderA !== orderB) return orderA - orderB;
        // Fallback to newest first if orders are same (e.g. 0)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    return acc;
  }, {} as Record<string, Lead[]>);

  // Network update based on the generic KanbanBoard's onReorder payload
  const handleDrop = async (leadId: number, newStatus: string, index?: number) => {
    try {
      // Find the cards currently in that status to calculate the new kanban_order
      const targetColumnCards = leadsByStatus[newStatus.toLowerCase()] || [];
      const draggedCard = leads.find(l => l.id === leadId);
      if (!draggedCard) return;

      // Filter out the dragged card itself from the target column if it's already there
      const cardsWithoutDragged = targetColumnCards.filter(l => l.id !== leadId);

      let newOrder = 0;

      if (cardsWithoutDragged.length === 0) {
        // If it's the first and only card in the column
        newOrder = 1000;
      } else if (index === undefined || index >= cardsWithoutDragged.length) {
        // Dropped at the very bottom
        const lastCard = cardsWithoutDragged[cardsWithoutDragged.length - 1];
        newOrder = (lastCard.kanban_order || 0) + 1000;
      } else if (index <= 0) {
        // Dropped at the very top
        const firstCard = cardsWithoutDragged[0];
        newOrder = (firstCard.kanban_order || 0) - 1000;
      } else {
        // Dropped exactly between two existing cards
        const cardBefore = cardsWithoutDragged[index - 1];
        const cardAfter = cardsWithoutDragged[index];
        newOrder = ((cardBefore.kanban_order || 0) + (cardAfter.kanban_order || 0)) / 2;
      }

      // Optimistic UI update
      setLeads(prev => prev.map(l =>
        l.id === leadId ? { ...l, status: newStatus.toLowerCase(), kanban_order: newOrder } : l
      ));

      // Network update
      const oldStatus = draggedCard.status;
      const { error } = await supabase.from('leads').update({ status: newStatus.toLowerCase(), kanban_order: newOrder }).eq('id', leadId);
      if (error) throw error;

      // Log activity
      if (oldStatus !== newStatus.toLowerCase()) {
        await supabase.from('log_activities').insert({
          lead_id: leadId,
          user_id: user.id,
          content: `Status changed from ${oldStatus.toLowerCase()} to ${newStatus.toLowerCase()}`,
          activity_type: 'status_change',
        });
      }

      setToast({
        isOpen: true,
        message: `Status lead berhasil diubah ke ${newStatus.toUpperCase()}`,
        type: 'success'
      });
    } catch (err: any) {
      setToast({
        isOpen: true,
        message: 'Gagal mengubah status: ' + err.message,
        type: 'error'
      });
      fetchData(); // Rollback on error
    }
  };

  if (!activeCompany) return <div className="p-8 text-center text-gray-400">Pilih workspace terlebih dahulu.</div>;

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <H2 className="text-xl ">Leads Pipeline</H2>
            <Subtext className="text-[10px]  uppercase">Kelola prospek dan konversi penjualan Anda.</Subtext>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-50 border border-gray-100 p-1 rounded-xl">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('table')}
                className={`!p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm ring-1 ring-gray-100 text-blue-600' : 'text-gray-400'}`}
              >
                <List size={14} strokeWidth={2.5} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('kanban')}
                className={`!p-2 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm ring-1 ring-gray-100 text-blue-600' : 'text-gray-400'}`}
              >
                <LayoutGrid size={14} strokeWidth={2.5} />
              </Button>
            </div>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              leftIcon={<Plus size={14} strokeWidth={3} />}
              className="!px-6 py-2.5  text-[10px] uppercase  shadow-lg shadow-blue-100"
              variant='primary'
              size='sm'
            >
              Tambah Lead
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-50">
          <div className="w-[400px] shrink-0">
            <SearchInput
              placeholder="Cari lead, klien..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-auto">
            <DateFilterDropdown
              value={dateFilterType}
              onChange={setDateFilterType}
              startDate={startDateFilter}
              endDate={endDateFilter}
              onStartDateChange={setStartDateFilter}
              onEndDateChange={setEndDateFilter}
            />
            <ComboBox
              value={statusFilter}
              onChange={(val: string | number) => setStatusFilter(val.toString())}
              options={[
                { value: 'all', label: 'SEMUA STATUS' },
                ...stages.map(s => ({ value: s.name.toLowerCase(), label: s.name.toUpperCase() }))
              ]}
              className="w-40"
              hideSearch
              placeholderSize="text-[10px] font-bold text-gray-900 uppercase "
            />
            <ComboBox
              value={assigneeFilter}
              onChange={(val: string | number) => setAssigneeFilter(val.toString())}
              options={[
                { value: 'all', label: 'SEMUA STAFF' },
                ...members.map(m => ({
                  value: m.user_id,
                  label: (m.profile?.full_name || m.user_id).toUpperCase()
                }))
              ]}
              className="w-40"
              placeholderSize="text-[10px] font-bold text-gray-900 uppercase "
            />
          </div>
        </div>
      </div>

      <div className="h-[80vh] overflow-hidden">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : viewMode === 'kanban' ? (
          <LeadsKanbanView
            stages={stages}
            leadsByStatus={leadsByStatus}
            onEdit={setSelectedLead}
            onDelete={handleDelete}
            onReorder={handleDrop}
            formatIDR={formatIDR}
            hasUrgency={activeCompany?.has_lead_urgency}
          />
        ) : (
          <LeadsTableView
            leads={filteredLeads}
            sortConfig={sortConfig}
            onSort={handleSort}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            onEdit={setSelectedLead}
            onDelete={handleDelete}
            onToggleUrgency={handleToggleUrgency}
            formatIDR={formatIDR}
          />
        )}
      </div>

      {isAddModalOpen && (
        <LeadAddModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleCreateSuccess}
          company={activeCompany}
          members={members}
          stages={stages}
          sources={sources}
          clientCompanies={clientCompanies}
          categories={categories}
          setClientCompanies={setClientCompanies}
          setCategories={setCategories}
          setToast={setToast}
        />
      )}

      {selectedLead && (
        <LeadDetailModal
          isOpen={!!selectedLead}
          lead={selectedLead}
          company={activeCompany}
          members={members}
          stages={stages}
          onClose={() => setSelectedLead(null)}
          onUpdate={handleUpdate}
          onDelete={() => handleDelete(selectedLead.id)}
          onConvertToDeal={() => setIsConvertModalOpen(true)}
          user={members.find(m => m.user_id === selectedLead.sales_id)?.profile as any}
          sources={sources}
          clientCompanies={clientCompanies}
          categories={categories}
          setClientCompanies={setClientCompanies}
          setCategories={setCategories}
          setToast={setToast}
        />
      )}

      {isConvertModalOpen && selectedLead && activeCompany && (
        <ConvertLeadModal
          isOpen={isConvertModalOpen}
          onClose={() => setIsConvertModalOpen(false)}
          lead={selectedLead}
          companyId={activeCompany.id}
          userId={user.id}
          onSuccess={() => {
            setIsConvertModalOpen(false);
            setSelectedLead(null);
            fetchData();
          }}
          setToast={setToast}
        />
      )}

      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        onConfirm={executeDelete}
        title="Hapus Lead"
        itemName="Lead ini"
        description="Apakah Anda yakin ingin menghapus data lead ini dari sistem?"
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
