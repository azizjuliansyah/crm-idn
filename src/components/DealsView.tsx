
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, CompanyMember, PipelineStage, Deal, Pipeline, Client, ClientCompany, ClientCompanyCategory, Profile } from '@/lib/types';
import { Plus, Search, LayoutGrid, List } from 'lucide-react';
import { DealAddModal } from './DealAddModal';
import { DealDetailModal } from './DealDetailModal';
import { DealsTableView } from './DealsTableView';
import { DealsKanbanView } from './DealsKanbanView';

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

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

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
      // Fetch Pipeline (assuming single pipeline for now or logic to select default)
      // In original code, pipelineId was a prop. Here we might need to fetch default pipeline.
      let query = supabase
        .from('pipelines')
        .select('*, stages:pipeline_stages(*)')
        .eq('company_id', activeCompany.id);

      if (pipelineId) {
        query = query.eq('id', pipelineId);
      }
      
      const { data: pipelinesData } = await query.limit(1).single();

      if (pipelinesData) {
        setPipeline({
            ...pipelinesData,
            stages: (pipelinesData.stages || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
        });
      }

      // Fetch Members
      const { data: membersData } = await supabase
        .from('company_members')
        .select(`
          *,
          profile:profiles!inner(full_name, avatar_url, email),
          role:company_roles(name)
        `)
        .eq('company_id', activeCompany.id);

      if (membersData) setMembers(membersData);

      // Fetch Auxiliary
      const [clientsRes, cosRes, catsRes] = await Promise.all([
        supabase.from('clients').select('*').eq('company_id', activeCompany.id).order('name'),
        supabase.from('client_companies').select('*').eq('company_id', activeCompany.id).order('name'),
        supabase.from('client_company_categories').select('*').eq('company_id', activeCompany.id).order('name')
      ]);
      
      if (clientsRes.data) setClients(clientsRes.data);
      if (cosRes.data) setClientCompanies(cosRes.data);
      if (catsRes.data) setCategories(catsRes.data);

      if (pipelinesData) {
        // Fetch Deals from deals table
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
    setSelectedDeal(null);
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
    
    return matchesSearch && matchesStatus && matchesAssignee;
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Deals & Penjualan</h1>
          <p className="text-sm text-gray-500 font-medium">Monitoring transaksi dan pipeline penjualan.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex bg-gray-100 p-1 rounded-lg">
              <button 
                onClick={() => setViewMode('kanban')}
                className={`p-2 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List size={18} />
              </button>
           </div>
           <button 
             onClick={() => setIsAddModalOpen(true)}
             className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
           >
             <Plus size={18} /> Buat Deal
           </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
         <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari deal, klien..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
         </div>
         <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0">
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:border-blue-500"
            >
              <option value="all">Semua Status</option>
              {pipeline?.stages?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select 
              value={assigneeFilter}
              onChange={e => setAssigneeFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:border-blue-500"
            >
               <option value="all">Semua Staff</option>
               {members.map(m => (
                 <option key={m.id} value={m.user_id}>{m.profile?.full_name || m.user_id}</option>
               ))}
            </select>
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
          />
        )}
      </div>

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
          user={members.find(m => m.user_id === selectedDeal.sales_id)?.profile as any}
        />
      )}
    </div>
  );
};
