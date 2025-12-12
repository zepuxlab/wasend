import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { templatesApi } from '@/lib/api';
import { templatesBackendApi } from '@/lib/backend-api';
import { toast } from '@/hooks/use-toast';

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: templatesApi.getAll,
  });
}

export function useApprovedTemplates() {
  return useQuery({
    queryKey: ['templates', 'approved'],
    queryFn: templatesApi.getApproved,
  });
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: ['templates', id],
    queryFn: () => templatesApi.getById(id),
    enabled: !!id,
  });
}

export function useSyncTemplates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Call backend API to sync templates from Meta
      // Backend handles the Meta API communication
      try {
        const result = await templatesBackendApi.sync();
        return result;
      } catch (error: any) {
        // If backend is not available, show helpful message
        if (error.message.includes('Failed to fetch')) {
          throw new Error('Бэкенд сервер недоступен. Убедитесь что сервер запущен.');
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({
        title: 'Шаблоны синхронизированы',
        description: `Обновлено шаблонов: ${data.synced}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Ошибка синхронизации',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpsertTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: templatesApi.upsert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
