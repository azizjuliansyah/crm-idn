import React, { useState, useEffect } from 'react';
import { Input, Select, Button, H1, Subtext, Label, SearchInput } from '@/components/ui';

import { supabase } from '@/lib/supabase';
import { Company, CompanyMember, PipelineStage, Deal, Pipeline, Client, ClientCompany, ClientCompanyCategory, Profile } from '@/lib/types';
import { Plus, Search, LayoutGrid, List } from 'lucide-react';
import { DealAddModal } from './DealAddModal';
import { DealDetailModal } from './DealDetailModal';
import { DealsTableView } from './DealsTableView';
import { DealsKanbanView } from './DealsKanbanView';
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
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  // Drag & Drop State
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

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
  };

  const handleUpdate = () => {
    fetchData();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus deal ini?')) return;
    try {
      await supabase.from('deals').delete().eq('id', id);
      fetchData();
      if (selectedDeal?.id === id) setSelectedDeal(null);
    } catch (error) {
      console.error('Error deleting deal:', error);
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
    const matchesStartDate = !startDateFilter || dealDate >= startDateFilter;
    const matchesEndDate = !endDateFilter || dealDate <= endDateFilter;

    return matchesSearch && matchesStatus && matchesAssignee && matchesStartDate && matchesEndDate;
  }).sort((a, b) => {
    if (!sortConfig) return 0;
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
    acc[stage.id] = filteredDeals.filter(l => l.stage_id === stage.id);
    return acc;
  }, {} as Record<string, Deal[]>);

  // Drag and Drop handlers
  const handleDrop = async (dealId: number, newStageId: string) => {
    try {
      await supabase.from('deals').update({ stage_id: newStageId }).eq('id', dealId);
      fetchData(); // Refresh to update UI
    } catch (err) { console.error(err); }
  };

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDropTarget(stageId);
  };

  const handleDropEvent = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDropTarget(null);
    if (draggedId) {
      handleDrop(draggedId, stageId);
      setDraggedId(null);
    }
  };

  if (!activeCompany) return <div className="p-8 text-center text-gray-400">Pilih workspace terlebih dahulu.</div>;

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <H1 className="text-xl  tracking-tight">Deals & Penjualan</H1>
            <Subtext className="text-[10px]  uppercase tracking-tight leading-none">Monitoring transaksi dan pipeline penjualan.</Subtext>
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
              variant='success'
            >
              Buat Deal
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-4 border-t border-gray-50 overflow-x-auto scrollbar-hide">
          <div className="w-[400px] shrink-0">
            <SearchInput
              placeholder="Cari deal, klien..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="rounded-xl border-gray-100 shadow-none bg-gray-50/30"
            />
          </div>
          <div className="flex gap-3 shrink-0 ml-auto items-center">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-2">
              <Input
                type="date"
                value={startDateFilter}
                onChange={e => setStartDateFilter(e.target.value)}
                className="bg-transparent border-none text-[10px]  uppercase tracking-tight text-gray-500 py-2 outline-none w-[110px]"
                title="Mulai Tanggal"
              />
              <Label className="text-gray-300 text-[10px] ">-</Label>
              <Input
                type="date"
                value={endDateFilter}
                onChange={e => setEndDateFilter(e.target.value)}
                className="bg-transparent border-none text-[10px]  uppercase tracking-tight text-gray-500 py-2 outline-none w-[110px]"
                title="Sampai Tanggal"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="!text-[10px] uppercase tracking-tight text-gray-400 w-36"
            >
              <option value="all">SEMUA STATUS</option>
              {pipeline?.stages?.map(s => <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>)}
            </Select>
            <Select
              value={assigneeFilter}
              onChange={e => setAssigneeFilter(e.target.value)}
              className="!text-[10px] uppercase tracking-tight text-gray-400 w-36"
            >
              <option value="all">SEMUA STAFF</option>
              {members.map(m => (
                <option key={m.id} value={m.user_id}>{(m.profile?.full_name || m.user_id).toUpperCase()}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-[400px]">
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
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDropEvent}
            dropTarget={dropTarget}
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
          user={user as any}
          onCreateQuotation={handleCreateQuotation}
          onEditQuotation={handleEditQuotation}
        />
      )}
    </div>
  );
};
