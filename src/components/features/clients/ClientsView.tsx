'use client';

import React, { useState, useMemo } from 'react';
import { 
  Button, 
  H2, 
  Subtext, 
  SearchInput,
} from '@/components/ui';
import { useAppStore } from '@/lib/store/useAppStore';
import { Company, Client, ClientWithCompany } from '@/lib/types';
import { Trash2, Loader2, UserPlus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { ConfirmBulkDeleteModal } from '@/components/shared/modals/ConfirmBulkDeleteModal';
import { ClientFormModal } from './components/ClientFormModal';
import { useClientsQuery, useClientMetadata, useClientMutations } from '@/lib/hooks/useClientsQuery';
import { useClientFilters } from '@/lib/hooks/useClientFilters';
import { ClientsTableView } from './ClientsTableView';
import { ClientFilterBar } from './ClientFilterBar';
import { StandardFilterBar } from '@/components/shared/filters/StandardFilterBar';
import { BulkActionGroup } from '@/components/shared/filters/BulkActionGroup';

interface Props {
  company: Company;
  initialClients?: { data: Client[], totalCount: number };
  metadata?: any;
}

export const ClientsView: React.FC<Props> = ({ 
  company,
  initialClients,
  metadata
}) => {
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedClient, setSelectedClient] = useState<Partial<Client>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Custom Modal States
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null; name: string }>({ 
    isOpen: false, 
    id: null, 
    name: '' 
  });
  const [isConfirmBulkOpen, setIsConfirmBulkOpen] = useState(false);
  const { showToast } = useAppStore();

  // Filters State
  const { 
    searchTerm, setSearchTerm,
    companyFilter, setCompanyFilter,
    sortConfig, handleSort
  } = useClientFilters([]);

  // Data Fetching
  const {
    data: queryData,
    isLoading: loadingClients,
    isPlaceholderData: isFetchingNewPage,
  } = useClientsQuery({
    companyId: company.id,
    searchTerm,
    companyFilter,
    sortConfig,
    page,
    pageSize
  }, initialClients);

  // Metadata
  const { clientCompanies: metadataCompanies, categories: metadataCategories } = useClientMetadata(company.id, metadata);
  const rawCompanies = metadataCompanies.data || [];
  const categories = metadataCategories.data || [];
  const loadingMetadata = metadataCompanies.isLoading || metadataCategories.isLoading;

  // Mutations
  const { deleteClient, bulkDeleteClients, upsertClient } = useClientMutations();

  // Computed Data
  const clientCompaniesList = useMemo(() => {
    return rawCompanies.map((co: any) => ({
      ...co,
      client_company_categories: categories.find((cat: any) => cat.id === co.category_id)
    }));
  }, [rawCompanies, categories]);

  const clients = useMemo(() => {
    const rawData = queryData?.data || [];
    return rawData.map(item => ({
      ...item,
      client_company: clientCompaniesList.find((co: any) => co.id === item.client_company_id)
    })) as ClientWithCompany[];
  }, [queryData, clientCompaniesList]);

  // Handlers
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === clients.length) setSelectedIds([]);
    else setSelectedIds(clients.map(i => i.id));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await bulkDeleteClients.mutateAsync(selectedIds);
      setSelectedIds([]);
      setIsConfirmBulkOpen(false);
      showToast(`Berhasil menghapus ${selectedIds.length} data client.`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    try {
      await deleteClient.mutateAsync(confirmDelete.id);
      setConfirmDelete({ isOpen: false, id: null, name: '' });
      showToast(`Data client ${confirmDelete.name} telah dihapus.`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenAdd = () => {
    setSelectedClient({ salutation: '', name: '', client_company_id: null, email: '', whatsapp: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  if ((loadingClients && clients.length === 0) || loadingMetadata) return (
    <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border-2 border-gray-300 shadow-none min-h-[400px]">
      <Loader2 className="animate-spin text-emerald-600 mb-4" size={32} />
      <Subtext className="text-[10px] uppercase text-gray-400">Mensinkronisasi Data Client...</Subtext>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 text-gray-900">
      <StandardFilterBar
        title="Kontak Client"
        subtitle="Kelola daftar kontak person client."
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Cari client atau perusahaan..."
        primaryAction={{
          label: "Client Baru",
          onClick: handleOpenAdd,
          icon: <UserPlus size={14} />
        }}
        bulkActions={
          <BulkActionGroup
            selectedCount={selectedIds.length}
            onDelete={() => setIsConfirmBulkOpen(true)}
          />
        }
      >
        <ClientFilterBar
          companyFilter={companyFilter}
          setCompanyFilter={(val) => { setCompanyFilter(val); setPage(1); }}
          clientCompanies={rawCompanies}
        />
      </StandardFilterBar>

      <ClientsTableView 
        clients={clients}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onEdit={handleOpenEdit}
        onDelete={(id, name) => setConfirmDelete({ isOpen: true, id, name })}
        sortConfig={sortConfig}
        onSort={handleSort}
        
        page={page}
        pageSize={pageSize}
        totalCount={queryData?.totalCount || 0}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1); // Reset to first page when size changes
        }}
        isLoading={loadingClients || isFetchingNewPage}
      />

      <ClientFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={async (formData) => {
          try {
            await upsertClient.mutateAsync({ ...formData, company_id: company.id } as Partial<Client>);
            setIsModalOpen(false);
            showToast('Data Berhasil Disimpan', 'success');
          } catch (err: any) {
            showToast(err.message, 'error');
          }
        }}
        form={selectedClient}
        setForm={setSelectedClient as any}
        isProcessing={upsertClient.status === 'pending'}
        clientCompanies={rawCompanies}
        categories={categories}
        companyId={company.id}
      />

      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
        onConfirm={executeDelete}
        itemName={`Data client ${confirmDelete.name}`}
        description="Anda akan menghapus data ini secara permanen. Seluruh riwayat transaksi yang terhubung dengan client ini mungkin terpengaruh."
        isProcessing={deleteClient.status === 'pending'}
      />

      <ConfirmBulkDeleteModal
        isOpen={isConfirmBulkOpen}
        onClose={() => setIsConfirmBulkOpen(false)}
        onConfirm={handleBulkDelete}
        count={selectedIds.length}
        description={`Apakah Anda yakin ingin menghapus seluruh client yang dipilih secara permanen? Tindakan ini tidak dapat dibatalkan.`}
        isProcessing={bulkDeleteClients.status === 'pending'}
      />

    </div>
  );
};
