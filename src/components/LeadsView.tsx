
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, CompanyMember, LeadStage, Lead, ClientCompany, ClientCompanyCategory, LeadSource } from '@/lib/types';
import { Plus, Search, LayoutGrid, List } from 'lucide-react';
import { LeadAddModal } from './LeadAddModal';
import { LeadDetailModal } from './LeadDetailModal';
import { LeadsTableView } from './LeadsTableView';
import { LeadsKanbanView } from './LeadsKanbanView';

interface Props {
  activeCompany: Company | null;
  activeView: string;
}

export const LeadsView: React.FC<Props> = ({ activeCompany, activeView }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('table');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Drag & Drop State
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  
  // Auxiliary Data
  const [sources, setSources] = useState<LeadSource[]>([]);
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
      // Fetch Stages from lead_stages
      const { data: stagesData } = await supabase
        .from('lead_stages')
        .select('*')
        .eq('company_id', activeCompany.id)
        .order('sort_order');

      if (stagesData) setStages(stagesData);

      // Fetch Auxiliary Data
      const [sourcesRes, cosRes, catsRes] = await Promise.all([
        supabase.from('lead_sources').select('*').eq('company_id', activeCompany.id).order('name'),
        supabase.from('client_companies').select('*').eq('company_id', activeCompany.id).order('name'),
        supabase.from('client_company_categories').select('*').eq('company_id', activeCompany.id).order('name')
      ]);

      if (sourcesRes.data) setSources(sourcesRes.data);
      if (cosRes.data) setClientCompanies(cosRes.data);
      if (catsRes.data) setCategories(catsRes.data);

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

      // Fetch Leads from leads table
      const { data: leadsData } = await supabase
        .from('leads')
        .select(`
          *,
          client_company:client_companies(name),
          sales_profile:profiles!leads_sales_id_fkey(full_name, avatar_url, email)
        `)
        .eq('company_id', activeCompany.id)
        .order('created_at', { ascending: false });

      if (leadsData) setLeads(leadsData);
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
  };

  const handleUpdate = () => {
    setSelectedLead(null);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus lead ini?')) return;
    try {
      await supabase.from('leads').delete().eq('id', id);
      fetchData();
      if (selectedLead?.id === id) setSelectedLead(null);
    } catch (error) {
      console.error('Error deleting lead:', error);
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
  const leadsByStatus = stages.reduce((acc, stage) => {
    acc[stage.name] = filteredLeads.filter(l => l.status === stage.name.toLowerCase());
    return acc;
  }, {} as Record<string, Lead[]>);

  // Drag and Drop handlers
  const handleDrop = async (leadId: number, newStatus: string) => {
     try {
       await supabase.from('leads').update({ status: newStatus.toLowerCase() }).eq('id', leadId);
       fetchData(); // Refresh to update UI
     } catch (err) { console.error(err); }
  };

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, stageName: string) => {
    e.preventDefault();
    setDropTarget(stageName);
  };

  const handleDropEvent = (e: React.DragEvent, stageName: string) => {
    e.preventDefault();
    setDropTarget(null);
    if (draggedId) {
      handleDrop(draggedId, stageName);
      setDraggedId(null);
    }
  };

  if (!activeCompany) return <div className="p-8 text-center text-gray-400">Pilih workspace terlebih dahulu.</div>;

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Leads Pipeline</h1>
          <p className="text-sm text-gray-500 font-medium">Kelola prospek dan konversi penjualan Anda.</p>
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
             <Plus size={18} /> Tambah Lead
           </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
         <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari lead, klien..." 
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
              {stages.map(s => <option key={s.id} value={s.name.toLowerCase()}>{s.name}</option>)}
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
          <LeadsKanbanView 
            stages={stages}
            leadsByStatus={leadsByStatus}
            onEdit={setSelectedLead}
            onDelete={handleDelete}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDropEvent}
            dropTarget={dropTarget}
            formatIDR={formatIDR}
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
            formatIDR={formatIDR}
          />
        )}
      </div>

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
      />

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
          onConvertToDeal={() => {/* Implement conversion logic */}}
          user={members.find(m => m.user_id === selectedLead.sales_id)?.profile as any}
          sources={sources}
          clientCompanies={clientCompanies}
        />
      )}
    </div>
  );
};
