import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Task, TaskStage, Project } from '@/lib/types';

interface FetchTasksParams {
  projectId: number;
  searchTerm?: string;
  stageId?: string;
}

export function useTasksQuery({
  projectId,
  searchTerm,
  stageId,
}: FetchTasksParams) {
  return useInfiniteQuery({
    queryKey: ['tasks-list', { projectId, searchTerm, stageId }],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * 20;
      const to = from + 19;

      let query = supabase
        .from('tasks')
        .select('*, assigned_profile:profiles(*)', { count: 'exact' })
        .eq('project_id', projectId);

      if (searchTerm) {
        query = query.ilike('title', `%${searchTerm}%`);
      }

      if (stageId) {
        query = query.eq('stage_id', stageId);
      }

      const { data, error, count } = await query
        .order('id', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        data: data as Task[],
        nextPage: data.length === 20 ? pageParam + 1 : undefined,
        totalCount: count || 0,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!projectId,
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

  return { upsertTask, deleteTask, updateTaskStage };
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
