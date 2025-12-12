import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { logsApi } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';

export function useLogs(options?: { campaignId?: string; limit?: number }) {
  return useQuery({
    queryKey: ['logs', options],
    queryFn: () => logsApi.getAll(options),
    refetchInterval: 5000, // Refetch every 5 seconds
  });
}

export function useRealtimeLogs() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel('activity_logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['logs'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
