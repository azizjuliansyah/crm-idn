import { useState, useMemo } from 'react';
import { Project } from '@/lib/types';

/**
 * Custom hook to manage searching, filtering, and sorting for Projects.
 */
export function useProjectFilters(projects: Project[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const filteredProjects = useMemo(() => {
    // Current pattern relies on supabase server-side filters.
    // Client-side filtering logic can be added here if needed in the future.
    return projects;
  }, [projects]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return {
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    assigneeFilter, setAssigneeFilter,
    clientFilter, setClientFilter,
    sortConfig, setSortConfig,
    filteredProjects,
    handleSort
  };
}
