import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { templatesBackendApi, Template } from '@/lib/backend-api';
import { toast } from '@/hooks/use-toast';

export function useTemplatesFromBackend() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesBackendApi.getAll(),
  });
}

export function useApprovedTemplatesFromBackend() {
  return useQuery({
    queryKey: ['templates', 'approved'],
    queryFn: async () => {
      const templates = await templatesBackendApi.getAll();
      return templates.filter((t: Template) => t.status === 'approved');
    },
  });
}

export function useTemplateFromBackend(id: string) {
  return useQuery({
    queryKey: ['templates', id],
    queryFn: () => templatesBackendApi.getById(id),
    enabled: !!id,
  });
}

export function useSyncTemplatesBackend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => templatesBackendApi.sync(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({
        title: 'Templates synced',
        description: `${data.synced} templates synced from Meta`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Sync failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
