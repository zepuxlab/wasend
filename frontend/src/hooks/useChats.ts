import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { chatsApi } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

export function useChats() {
  return useQuery({
    queryKey: ['chats'],
    queryFn: chatsApi.getAll,
  });
}

export function useChatMessages(chatId: string) {
  return useQuery({
    queryKey: ['chats', chatId, 'messages'],
    queryFn: () => chatsApi.getMessages(chatId),
    enabled: !!chatId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chatId, content }: { chatId: string; content: string }) =>
      chatsApi.sendMessage(chatId, content),
    onSuccess: (_, { chatId }) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['chats', chatId, 'messages'] });
    },
    onError: (error) => {
      toast({
        title: 'Message failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useRealtimeMessages(chatId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !chatId) return;

    const channel = supabase
      .channel(`messages:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chats', chatId, 'messages'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, queryClient]);
}
