import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Project, ProjectPipeline, ProjectPipelineStage, CompanyMember, Client, ClientCompany, ClientCompanyCategory } from '@/lib/types';

interface FetchProjectsParams {
  companyId: number;
  pipelineId: number;
  searchTerm?: string;
  statusFilter?: string;
  assigneeFilter?: string;
  clientFilter?: string;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  page?: number;
  pageSize?: number;
}

export function useProjectsQuery({
  companyId,
  pipelineId,
  searchTerm,
  statusFilter,
  assigneeFilter,
  clientFilter,
  sortConfig,
  page = 1,
  pageSize = 20,
}: FetchProjectsParams) {
  return useQuery({
    queryKey: ['projects', { companyId, pipelineId, searchTerm, statusFilter, assigneeFilter, clientFilter, sortConfig, page, pageSize }],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase.from('projects').select(`
        *,
        client:clients(*),
        lead_profile:profiles!projects_lead_id_fkey(*),
        team_members:project_team_members(user_id, profile:profiles(*))
      `, { count: 'exact' });

      query = query.eq('pipeline_id', pipelineId);

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('stage_id', statusFilter);
      }

      if (assigneeFilter && assigneeFilter !== 'all') {
        query = query.eq('lead_id', assigneeFilter);
      }

      if (clientFilter && clientFilter !== 'all') {
        query = query.eq('client_id', clientFilter);
      }

      if (sortConfig) {
        query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error, count } = await query.range(from, to);
      if (error) throw error;

      return {
        data: data as Project[],
        totalCount: count || 0,
      };
    },
    enabled: !!companyId && !!pipelineId,
    placeholderData: (previousData) => previousData,
  });
}

export function useProjectMutations() {
  const queryClient = useQueryClient();

  const deleteProject = useMutation({
    mutationFn: async (projectId: number) => {
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const updateProjectStatus = useMutation({
    mutationFn: async ({ projectId, stageId, kanbanOrder }: { projectId: number; stageId: string | number; kanbanOrder?: number }) => {
      const payload: any = { stage_id: stageId };
      if (kanbanOrder !== undefined) payload.kanban_order = kanbanOrder;
      
      const { error } = await supabase.from('projects').update(payload).eq('id', projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const bulkDeleteProjects = useMutation({
    mutationFn: async (ids: number[]) => {
      const { error } = await supabase.from('projects').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const bulkUpdateProjectsStatus = useMutation({
    mutationFn: async ({ ids, stageId }: { ids: number[]; stageId: string | number }) => {
      const { error } = await supabase.from('projects').update({ stage_id: stageId }).in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  return { deleteProject, updateProjectStatus, bulkDeleteProjects, bulkUpdateProjectsStatus };
}

export function useProjectMetadata(companyId: number, pipelineId: number) {
  return {
    pipeline: useQuery({
      queryKey: ['project-pipeline', companyId, pipelineId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('project_pipelines')
          .select('*, stages:project_pipeline_stages(*)')
          .eq('id', pipelineId)
          .maybeSingle();
        if (error) throw error;
        if (data && data.stages) {
          data.stages = data.stages.sort((a: any, b: any) => a.sort_order - b.sort_order);
        }
        return data as ProjectPipeline;
      },
      enabled: !!companyId && !!pipelineId,
    }),
    members: useQuery({
      queryKey: ['company-members', companyId],
      queryFn: async () => {
        const { data, error } = await supabase.from('company_members').select(`
          *,
          profile:profiles!inner(id, full_name, avatar_url, email),
          role:company_roles(name)
        `).eq('company_id', companyId);
        if (error) throw error;
        return data as CompanyMember[];
      },
      enabled: !!companyId,
    }),
    clients: useQuery({
      queryKey: ['clients', companyId],
      queryFn: async () => {
        const { data, error } = await supabase.from('clients').select('*').eq('company_id', companyId).order('name');
        if (error) throw error;
        return data as Client[];
      },
      enabled: !!companyId,
    }),
    clientCompanies: useQuery({
      queryKey: ['client-companies', companyId],
      queryFn: async () => {
        const { data, error } = await supabase.from('client_companies').select('*').eq('company_id', companyId).order('name');
        if (error) throw error;
        return data as ClientCompany[];
      },
      enabled: !!companyId,
    }),
    categories: useQuery({
      queryKey: ['client-company-categories', companyId],
      queryFn: async () => {
        const { data, error } = await supabase.from('client_company_categories').select('*').eq('company_id', companyId).order('name');
        if (error) throw error;
        return data as ClientCompanyCategory[];
      },
      enabled: !!companyId,
    }),
  };
}
