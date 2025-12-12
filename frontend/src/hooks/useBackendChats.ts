import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatsBackendApi, Chat, ChatWithMessages, Message } from '@/lib/backend-api';
import { toast } from '@/hooks/use-toast';

export function useChatsFromBackend() {
  return useQuery({
    queryKey: ['chats'],
    queryFn: () => chatsBackendApi.getAll(),
    refetchInterval: 10000, // Poll every 10 seconds for new messages
  });
}

export function useChatFromBackend(chatId: string) {
  return useQuery({
    queryKey: ['chats', chatId],
    queryFn: () => chatsBackendApi.getById(chatId),
    enabled: !!chatId,
    refetchInterval: 5000, // Poll every 5 seconds when viewing a chat
  });
}

export function useChatMessagesFromBackend(chatId: string) {
  return useQuery({
    queryKey: ['chats', chatId, 'messages'],
    queryFn: () => chatsBackendApi.getMessages(chatId),
    enabled: !!chatId,
    refetchInterval: 3000, // Poll frequently for new messages
  });
}

export function useSendMessageToBackend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chatId, content }: { chatId: string; content: string }) =>
      chatsBackendApi.sendMessage(chatId, content),
    onSuccess: (_, { chatId }) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['chats', chatId] });
      queryClient.invalidateQueries({ queryKey: ['chats', chatId, 'messages'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to send message',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useResolveChatFromBackend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chatId: string) => chatsBackendApi.resolve(chatId),
    onSuccess: (_, chatId) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['chats', chatId] });
      toast({
        title: 'Chat resolved',
        description: 'The chat has been marked as resolved',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to resolve chat',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useReopenChatFromBackend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chatId: string) => chatsBackendApi.reopen(chatId),
    onSuccess: (_, chatId) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['chats', chatId] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to reopen chat',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useAddChatTagFromBackend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chatId, tag }: { chatId: string; tag: string }) =>
      chatsBackendApi.addTag(chatId, tag),
    onSuccess: (_, { chatId }) => {
      queryClient.invalidateQueries({ queryKey: ['chats', chatId] });
      toast({
        title: 'Tag added',
        description: 'Tag has been added to the chat',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to add tag',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
