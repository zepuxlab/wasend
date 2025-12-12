import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignsApi, queueApi } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import type { CampaignStatus } from '@/types/database';

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: campaignsApi.getAll,
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: ['campaigns', id],
    queryFn: () => campaignsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: campaignsApi.create,
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

export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof campaignsApi.update>[1] }) =>
      campaignsApi.update(id, updates),
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

export function useCampaignStatusControl(campaignId: string) {
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: (status: CampaignStatus) => campaignsApi.updateStatus(campaignId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', campaignId] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const start = async () => {
    // First enqueue all recipients
    await queueApi.enqueueRecipients(campaignId);
    // Then update status to running
    await updateStatus.mutateAsync('running');
    toast({
      title: 'Campaign started',
      description: 'Messages are being sent',
    });
  };

  const pause = async () => {
    await updateStatus.mutateAsync('paused');
    toast({
      title: 'Campaign paused',
      description: 'Message sending has been paused',
    });
  };

  const resume = async () => {
    await updateStatus.mutateAsync('running');
    toast({
      title: 'Campaign resumed',
      description: 'Message sending has resumed',
    });
  };

  const stop = async () => {
    // Clear the queue first
    await queueApi.clearQueue(campaignId);
    // Then update status
    await updateStatus.mutateAsync('stopped');
    toast({
      title: 'Campaign stopped',
      description: 'Remaining messages have been cancelled',
    });
  };

  return {
    start,
    pause,
    resume,
    stop,
    isLoading: updateStatus.isPending,
  };
}

export function useAddCampaignRecipients() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      campaignId,
      contactIds,
      variableMapping,
    }: {
      campaignId: string;
      contactIds: string[];
      variableMapping: Record<string, string>;
    }) => campaignsApi.addRecipients(campaignId, contactIds, variableMapping),
    onSuccess: (_, { campaignId }) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', campaignId] });
    },
    onError: (error) => {
      toast({
        title: 'Error adding recipients',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useCampaignRecipients(campaignId: string) {
  return useQuery({
    queryKey: ['campaigns', campaignId, 'recipients'],
    queryFn: () => campaignsApi.getRecipients(campaignId),
    enabled: !!campaignId,
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: campaignsApi.delete,
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
