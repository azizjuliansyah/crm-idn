import { useState, useMemo } from 'react';
import { Task } from '@/lib/types';

export type ViewMode = 'table' | 'kanban' | 'gantt';

export function useTaskFilters(tasks: Task[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [stageId, setStageId] = useState<string | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const filteredTasks = useMemo(() => {
    // Current pattern relies on supabase server-side filters.
    // Client-side filtering logic can be added here if needed in the future.
    return tasks;
  }, [tasks]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return {
    searchTerm, setSearchTerm,
    viewMode, setViewMode,
    stageId, setStageId,
    assigneeFilter, setAssigneeFilter,
    sortConfig, setSortConfig,
    filteredTasks,
    handleSort
  };
}
