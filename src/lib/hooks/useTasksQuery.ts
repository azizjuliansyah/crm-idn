import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Task, TaskStage, Project } from '@/lib/types';

interface FetchTasksParams {
  projectId: number;
  searchTerm?: string;
  stageId?: string;
  assigneeFilter?: string;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  page?: number;
  pageSize?: number;
}

export function useTasksQuery({
  projectId,
  searchTerm,
  stageId,
  assigneeFilter,
  sortConfig,
  page = 1,
  pageSize = 20,
}: FetchTasksParams) {
  return useQuery({
    queryKey: ['tasks-list', { projectId, searchTerm, stageId, assigneeFilter, sortConfig, page, pageSize }],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('tasks')
        .select('*, assigned_profile:profiles(*)', { count: 'exact' })
        .eq('project_id', projectId);

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      if (stageId && stageId !== 'all') {
        query = query.eq('stage_id', stageId);
      }

      if (assigneeFilter && assigneeFilter !== 'all') {
        query = query.eq('assigned_id', assigneeFilter);
      }

      if (sortConfig) {
        query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error, count } = await query
        .range(from, to);

      if (error) throw error;

      return {
        data: data as Task[],
        totalCount: count || 0,
      };
    },
    enabled: !!projectId,
    placeholderData: (previousData) => previousData,
  });
}

export function useTaskMutations() {
  const queryClient = useQueryClient();

  const upsertTask = useMutation({
    mutationFn: async (task: Partial<Task>) => {
      if (task.id) {
        const { data, error } = await supabase
          .from('tasks')
          .update(task)
          .eq('id', task.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('tasks')
          .insert(task)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: number) => {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] });
    },
  });

  const updateTaskStage = useMutation({
    mutationFn: async ({ taskId, stageId }: { taskId: number; stageId: string }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ stage_id: stageId })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] });
    },
  });

  const bulkDeleteTasks = useMutation({
    mutationFn: async (ids: number[]) => {
      const { error } = await supabase.from('tasks').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] });
    },
  });

  const bulkUpdateTasksStage = useMutation({
    mutationFn: async ({ ids, stageId }: { ids: number[]; stageId: string }) => {
      const { error } = await supabase.from('tasks').update({ stage_id: stageId }).in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] });
    },
  });

  return { upsertTask, deleteTask, updateTaskStage, bulkDeleteTasks, bulkUpdateTasksStage };
}

export function useTaskMetadata(projectId: number, companyId: number) {
  return {
    project: useQuery({
      queryKey: ['project-detail', projectId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();
        if (error) throw error;
        return data as Project;
      },
      enabled: !!projectId,
    }),
    stages: useQuery({
      queryKey: ['task-stages', companyId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('task_stages')
          .select('*')
          .eq('company_id', companyId)
          .order('sort_order', { ascending: true });
        if (error) throw error;
        return data as TaskStage[];
      },
      enabled: !!companyId,
    }),
  };
}
