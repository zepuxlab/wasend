import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  campaignsBackendApi,
  Campaign,
  CampaignStats,
  CampaignRecipient,
  CreateCampaignRequest,
} from '@/lib/backend-api';
import { toast } from '@/hooks/use-toast';

export function useCampaignsFromBackend() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignsBackendApi.getAll(),
    refetchInterval: 10000,
  });
}

export function useCampaignFromBackend(id: string) {
  return useQuery({
    queryKey: ['campaigns', id],
    queryFn: () => campaignsBackendApi.getById(id),
    enabled: !!id,
    refetchInterval: 5000, // Poll for updates when viewing
  });
}

export function useCampaignStatsFromBackend(id: string) {
  return useQuery({
    queryKey: ['campaigns', id, 'stats'],
    queryFn: () => campaignsBackendApi.getStats(id),
    enabled: !!id,
    refetchInterval: 3000, // Poll frequently for live stats
  });
}

export function useCampaignRecipientsFromBackend(id: string) {
  return useQuery({
    queryKey: ['campaigns', id, 'recipients'],
    queryFn: () => campaignsBackendApi.getRecipients(id),
    enabled: !!id,
  });
}

export function useCreateCampaignBackend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCampaignRequest) => campaignsBackendApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({
        title: 'Campaign created',
        description: 'Your campaign has been created successfully',
      });
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

export function useUpdateCampaignBackend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCampaignRequest> }) =>
      campaignsBackendApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] });
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

export function useDeleteCampaignBackend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => campaignsBackendApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({
        title: 'Campaign deleted',
        description: 'The campaign has been deleted',
      });
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

// Campaign State Machine Controls
export function useCampaignControlsBackend(campaignId: string) {
  const queryClient = useQueryClient();

  const invalidateCampaign = () => {
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    queryClient.invalidateQueries({ queryKey: ['campaigns', campaignId] });
    queryClient.invalidateQueries({ queryKey: ['campaigns', campaignId, 'stats'] });
  };

  const startMutation = useMutation({
    mutationFn: () => campaignsBackendApi.start(campaignId),
    onSuccess: () => {
      invalidateCampaign();
      toast({
        title: 'Campaign started',
        description: 'Messages are being sent by the worker',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to start campaign',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: () => campaignsBackendApi.pause(campaignId),
    onSuccess: () => {
      invalidateCampaign();
      toast({
        title: 'Campaign paused',
        description: 'Worker has stopped sending messages',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to pause campaign',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => campaignsBackendApi.resume(campaignId),
    onSuccess: () => {
      invalidateCampaign();
      toast({
        title: 'Campaign resumed',
        description: 'Worker has resumed sending messages',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to resume campaign',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => campaignsBackendApi.stop(campaignId),
    onSuccess: () => {
      invalidateCampaign();
      toast({
        title: 'Campaign stopped',
        description: 'Campaign has been stopped and queue cleared',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to stop campaign',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    start: startMutation.mutateAsync,
    pause: pauseMutation.mutateAsync,
    resume: resumeMutation.mutateAsync,
    stop: stopMutation.mutateAsync,
    isLoading:
      startMutation.isPending ||
      pauseMutation.isPending ||
      resumeMutation.isPending ||
      stopMutation.isPending,
  };
}
