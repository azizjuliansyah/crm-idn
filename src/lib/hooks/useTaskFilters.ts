import { useState, useMemo } from 'react';
import { Task } from '@/lib/types';

export type ViewMode = 'table' | 'kanban' | 'gantt';

export function useTaskFilters(tasks: Task[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [stageId, setStageId] = useState<string | null>(null);

  const filteredTasks = useMemo(() => {
    // Current pattern relies on supabase server-side filters.
    // Client-side filtering logic can be added here if needed in the future.
    return tasks;
  }, [tasks]);

  return {
    searchTerm, setSearchTerm,
    viewMode, setViewMode,
    stageId, setStageId,
    filteredTasks
  };
}
