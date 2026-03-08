import React, { useState, useEffect } from 'react';
import { Input, Button, H1, Subtext, Label, SearchInput, DateFilterDropdown, ComboBox } from '@/components/ui';

import { supabase } from '@/lib/supabase';
import { Company, CompanyMember, PipelineStage, Deal, Pipeline, Client, ClientCompany, ClientCompanyCategory, Profile } from '@/lib/types';
import { Plus, Search, LayoutGrid, List } from 'lucide-react';
import { DealAddModal } from './DealAddModal';
import { DealDetailModal } from './DealDetailModal';
import { ConvertDealToProjectModal } from './ConvertDealToProjectModal';
import { DealsTableView } from './DealsTableView';
import { DealsKanbanView } from './DealsKanbanView';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { Toast, ToastType } from '@/components/ui';
import { useRouter } from 'next/navigation';

interface Props {
  activeCompany: Company | null;
  activeView: string;
  user: Profile;
  pipelineId?: number;
}

export const DealsView: React.FC<Props> = ({ activeCompany, activeView, user, pipelineId }) => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('table');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, id: number | null }>({ isOpen: false, id: null });
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
    isOpen: false,
    message: '',
    type: 'success',
  });

  // Auxiliary Data
  const [clients, setClients] = useState<Client[]>([]);
  const [clientCompanies, setClientCompanies] = useState<ClientCompany[]>([]);
  const [categories, setCategories] = useState<ClientCompanyCategory[]>([]);

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [dateFilterType, setDateFilterType] = useState<string>('all');
  const [followUpFilter, setFollowUpFilter] = useState<string>('all');

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const router = useRouter();

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
      let pipelineQuery = supabase
        .from('pipelines')
        .select('*, stages:pipeline_stages(*)')
        .eq('company_id', activeCompany.id);

      if (pipelineId) {
        pipelineQuery = pipelineQuery.eq('id', pipelineId);
      }

      const [
        pipelinesRes,
        membersRes,
        clientsRes,
        cosRes,
        catsRes
      ] = await Promise.all([
        pipelineQuery.limit(1).single(),
        supabase.from('company_members').select(`
          *,
          profile:profiles!inner(full_name, avatar_url, email),
          role:company_roles(name)
        `).eq('company_id', activeCompany.id),
        supabase.from('clients').select('*').eq('company_id', activeCompany.id).order('name'),
        supabase.from('client_companies').select('*').eq('company_id', activeCompany.id).order('name'),
        supabase.from('client_company_categories').select('*').eq('company_id', activeCompany.id).order('name')
      ]);

      const pipelinesData = pipelinesRes.data;

      if (pipelinesData) {
        setPipeline({
          ...pipelinesData,
          stages: (pipelinesData.stages || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
        });
      }

      if (membersRes.data) setMembers(membersRes.data);
      if (clientsRes.data) setClients(clientsRes.data as any[]);
      if (cosRes.data) setClientCompanies(cosRes.data as any[]);
      if (catsRes.data) setCategories(catsRes.data as any[]);

      if (pipelinesData) {
        const { data: dealsData } = await supabase
          .from('deals')
          .select(`
            *,
            sales_profile:profiles!deals_sales_id_fkey(full_name, avatar_url, email),
            client:clients(*),
            quotations(id, number)
            `)
          .eq('pipeline_id', pipelinesData.id)
          .order('kanban_order', { ascending: true })
          .order('created_at', { ascending: false });

        if (dealsData) setDeals(dealsData as any);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeCompany, pipelineId]);

  const handleCreateSuccess = () => {
    setIsAddModalOpen(false);
    fetchData();
    setToast({
      isOpen: true,
      message: 'Deal baru berhasil dibuat!',
      type: 'success'
    });
  };

  const handleUpdate = () => {
    fetchData();
    setToast({
      isOpen: true,
      message: 'Deal berhasil diperbarui!',
      type: 'success'
    });
  };

  const handleDelete = (id: number) => {
    setConfirmDelete({ isOpen: true, id });
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    try {
      await supabase.from('deals').delete().eq('id', confirmDelete.id);
      fetchData();
      if (selectedDeal?.id === confirmDelete.id) setSelectedDeal(null);
      setToast({
        isOpen: true,
        message: 'Deal berhasil dihapus!',
        type: 'success'
      });
      setConfirmDelete({ isOpen: false, id: null });
    } catch (error: any) {
      setToast({
        isOpen: true,
        message: 'Gagal menghapus deal: ' + error.message,
        type: 'error'
      });
    }
  };

  const handleToggleUrgency = async (id: number, current: boolean) => {
    try {
      const { error } = await supabase.from('deals').update({ is_urgent: !current }).eq('id', id);
      if (error) throw error;
      setDeals(prev => prev.map(d => d.id === id ? { ...d, is_urgent: !current } : d));
      setToast({
        isOpen: true,
        message: !current ? 'Deal ditandai sebagai urgent!' : 'Status urgent dihapus.',
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

  const handleCreateQuotation = (clientId: number, dealId: number) => {
    router.push(`/dashboard/sales/quotations/create?client_id=${clientId}&deal_id=${dealId}`);
  };

  const handleEditQuotation = (quotationId: number) => {
    router.push(`/dashboard/sales/quotations/${quotationId}`);
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
    if (selectedIds.length === filteredDeals.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDeals.map(l => l.id));
    }
  };

  // Filter Logic
  const filteredDeals = deals.filter(deal => {
    const matchesSearch =
      deal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (deal.contact_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || deal.stage_id === statusFilter;
    const matchesAssignee = assigneeFilter === 'all' || deal.sales_id === assigneeFilter;

    const dealDate = deal.input_date || deal.created_at.split('T')[0];
    let matchesDate = true;
    if (dateFilterType === 'custom') {
      matchesDate = (!startDateFilter || dealDate >= startDateFilter) && (!endDateFilter || dealDate <= endDateFilter);
    } else if (dateFilterType !== 'all') {
      const daysAgo = parseInt(dateFilterType);
      const filterDate = new Date();
      filterDate.setDate(filterDate.getDate() - daysAgo);
      matchesDate = dealDate >= filterDate.toISOString().split('T')[0];
    }
    const matchesFollowUp = followUpFilter === 'all' || (deal.follow_up || 0).toString() === followUpFilter;

    return matchesSearch && matchesStatus && matchesAssignee && matchesDate && matchesFollowUp;
  }).sort((a, b) => {
    // Priority 1: Urgency
    if (a.is_urgent && !b.is_urgent) return -1;
    if (!a.is_urgent && b.is_urgent) return 1;

    // Priority 2: Custom/Default Sort
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
  const dealsByStage = (pipeline?.stages || []).reduce((acc, stage) => {
    acc[stage.id] = filteredDeals
      .filter(l => l.stage_id === stage.id)
      .sort((a, b) => {
        const orderA = a.kanban_order || 0;
        const orderB = b.kanban_order || 0;
        if (orderA !== orderB) return orderA - orderB;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    return acc;
  }, {} as Record<string, Deal[]>);

  // Network update based on the generic KanbanBoard's onReorder payload
  const handleDrop = async (dealId: number, newStageId: string, index?: number) => {
    try {
      const targetColumnCards = dealsByStage[newStageId] || [];
      const draggedCard = deals.find(d => d.id === dealId);
      if (!draggedCard) return;

      const cardsWithoutDragged = targetColumnCards.filter(d => d.id !== dealId);

      let newOrder = 0;

      if (cardsWithoutDragged.length === 0) {
        newOrder = 1000;
      } else if (index === undefined || index >= cardsWithoutDragged.length) {
        const lastCard = cardsWithoutDragged[cardsWithoutDragged.length - 1];
        newOrder = (lastCard.kanban_order || 0) + 1000;
      } else if (index <= 0) {
        const firstCard = cardsWithoutDragged[0];
        newOrder = (firstCard.kanban_order || 0) - 1000;
      } else {
        const cardBefore = cardsWithoutDragged[index - 1];
        const cardAfter = cardsWithoutDragged[index];
        newOrder = ((cardBefore.kanban_order || 0) + (cardAfter.kanban_order || 0)) / 2;
      }

      // Optimistic Update
      setDeals(prev => prev.map(d =>
        d.id === dealId ? { ...d, stage_id: newStageId, kanban_order: newOrder } : d
      ));

      // Network Update
      const oldStageId = draggedCard.stage_id;
      const { error } = await supabase.from('deals').update({ stage_id: newStageId, kanban_order: newOrder }).eq('id', dealId);
      if (error) throw error;

      // Log activity
      if (oldStageId !== newStageId) {
        const oldStageName = pipeline?.stages?.find(s => s.id === oldStageId)?.name || 'Unknown';
        const newStageName = pipeline?.stages?.find(s => s.id === newStageId)?.name || 'Unknown';

        await supabase.from('log_activities').insert({
          deal_id: dealId,
          user_id: user.id,
          content: `Stage changed from ${oldStageName.toLowerCase()} to ${newStageName.toLowerCase()}`,
          activity_type: 'status_change',
        });
      }

      setToast({
        isOpen: true,
        message: 'Tahapan deal berhasil diubah!',
        type: 'success'
      });
    } catch (err: any) {
      setToast({
        isOpen: true,
        message: 'Gagal mengubah tahapan: ' + err.message,
        type: 'error'
      });
      fetchData(); // Rollback
    }
  };

  if (!activeCompany) return <div className="p-8 text-center text-gray-400">Pilih workspace terlebih dahulu.</div>;

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <H1 className="text-xl  ">Deals & Penjualan</H1>
            <Subtext className="text-[10px]  uppercase  leading-none">Monitoring transaksi dan pipeline penjualan.</Subtext>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-50 border border-gray-100 p-1 rounded-xl">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('table')}
                className={`!p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm ring-1 ring-gray-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List size={14} strokeWidth={2.5} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('kanban')}
                className={`!p-2 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm ring-1 ring-gray-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <LayoutGrid size={14} strokeWidth={2.5} />
              </Button>
            </div>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              leftIcon={<Plus size={14} strokeWidth={3} />}
              size='sm'
              variant='primary'
            >
              Buat Deal
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-50">
          <div className="w-[400px] shrink-0">
            <SearchInput
              placeholder="Cari deal, klien..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="rounded-xl border-gray-100 shadow-none bg-gray-50/30"
            />
          </div>
          <div className="flex gap-3 shrink-0 ml-auto items-center">
            <DateFilterDropdown
              value={dateFilterType}
              onChange={setDateFilterType}
              startDate={startDateFilter}
              endDate={endDateFilter}
              onStartDateChange={setStartDateFilter}
              onEndDateChange={setEndDateFilter}
            />
            <ComboBox
              value={followUpFilter}
              onChange={(val: string | number) => setFollowUpFilter(val.toString())}
              options={[
                { value: 'all', label: 'SEMUA FOLLOW UP' },
                ...Array.from(new Set(deals.map(d => d.follow_up || 0))).sort((a, b) => a - b).map(fu => ({
                  value: fu.toString(),
                  label: fu === 0 ? 'BELUM FU' : `FU ${fu} KALI`
                }))
              ]}
              className="w-40"
              hideSearch
              placeholderSize="text-[10px] font-bold text-gray-900 uppercase "
            />
            <ComboBox
              value={statusFilter}
              onChange={(val: string | number) => setStatusFilter(val.toString())}
              options={[
                { value: 'all', label: 'SEMUA STATUS' },
                ...(pipeline?.stages?.map(s => ({ value: s.id, label: s.name.toUpperCase() })) || [])
              ]}
              className="w-40"
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

      <div className="h-[80vh] mb-4 overflow-hidden">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : viewMode === 'kanban' ? (
          <DealsKanbanView
            pipeline={pipeline}
            dealsByStage={dealsByStage}
            onEdit={setSelectedDeal}
            onDelete={handleDelete}
            onReorder={handleDrop}
            formatIDR={formatIDR}
            onCreateQuotation={handleCreateQuotation}
            onEditQuotation={handleEditQuotation}
          />
        ) : (
          <DealsTableView
            deals={filteredDeals}
            sortConfig={sortConfig}
            onSort={handleSort}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            onEdit={setSelectedDeal}
            onDelete={handleDelete}
            onToggleUrgency={handleToggleUrgency}
            formatIDR={formatIDR}
            pipeline={pipeline}
            onCreateQuotation={handleCreateQuotation}
            onEditQuotation={handleEditQuotation}
          />
        )}
      </div>

      {isAddModalOpen && (
        <DealAddModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleCreateSuccess}
          company={activeCompany}
          members={members}
          pipeline={pipeline as any} // Cast safely after check
          clients={clients}
          clientCompanies={clientCompanies}
          categories={categories}
          setClients={setClients}
          setClientCompanies={setClientCompanies}
          setCategories={setCategories}
          user={user}
          setToast={setToast}
        />
      )}

      {selectedDeal && (
        <DealDetailModal
          isOpen={!!selectedDeal}
          deal={selectedDeal}
          company={activeCompany}
          members={members}
          pipeline={pipeline}
          clients={clients}
          clientCompanies={clientCompanies}
          onClose={() => setSelectedDeal(null)}
          onUpdate={handleUpdate}
          onDelete={() => handleDelete(selectedDeal.id)}
          onConvertToProject={() => setIsConvertModalOpen(true)}
          user={user as any}
          onCreateQuotation={handleCreateQuotation}
          onEditQuotation={handleEditQuotation}
          categories={categories}
          setClientCompanies={setClientCompanies}
          setCategories={setCategories}
          setToast={setToast}
        />
      )}

      {isConvertModalOpen && selectedDeal && activeCompany && (
        <ConvertDealToProjectModal
          isOpen={isConvertModalOpen}
          onClose={() => setIsConvertModalOpen(false)}
          deal={selectedDeal}
          companyId={activeCompany.id}
          userId={user.id}
          onSuccess={() => {
            setIsConvertModalOpen(false);
            setSelectedDeal(null);
            fetchData();
          }}
          setToast={setToast}
        />
      )}

      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        onConfirm={executeDelete}
        title="Hapus Deal"
        itemName="Deal ini"
        description="Apakah Anda yakin ingin menghapus data deal ini dari sistem?"
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
