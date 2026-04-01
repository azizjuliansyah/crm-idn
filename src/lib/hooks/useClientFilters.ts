import { useState, useMemo } from 'react';
import { Client } from '@/lib/types';

/**
 * Custom hook to manage searching, filtering, and sorting for Clients.
 */
export function useClientFilters(clients: Client[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ 
    key: 'id', 
    direction: 'desc' 
  });

  const filteredClients = useMemo(() => {
    // Current pattern relies on supabase server-side filters.
    // Client-side filtering logic can be added here if needed in the future.
    return clients;
  }, [clients]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return {
    searchTerm, setSearchTerm,
    sortConfig, setSortConfig,
    filteredClients,
    handleSort
  };
}
