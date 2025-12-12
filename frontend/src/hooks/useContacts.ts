import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactsApi, contactListsApi } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

export function useContacts() {
  return useQuery({
    queryKey: ['contacts'],
    queryFn: contactsApi.getAll,
  });
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ['contacts', id],
    queryFn: () => contactsApi.getById(id),
    enabled: !!id,
  });
}

export function useContactsByTags(tags: string[]) {
  return useQuery({
    queryKey: ['contacts', 'tags', tags],
    queryFn: () => contactsApi.getByTags(tags),
    enabled: tags.length > 0,
  });
}

export function useContactsByList(listId: string) {
  return useQuery({
    queryKey: ['contacts', 'list', listId],
    queryFn: () => contactsApi.getByList(listId),
    enabled: !!listId,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: contactsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({
        title: 'Contact created',
        description: 'The contact has been added',
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

export function useBulkCreateContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: contactsApi.bulkCreate,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({
        title: 'Contacts imported',
        description: `${data?.length || 0} contacts have been imported`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Import error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof contactsApi.update>[1] }) =>
      contactsApi.update(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contacts', id] });
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

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: contactsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({
        title: 'Contact deleted',
        description: 'The contact has been removed',
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

// Contact Lists
export function useContactLists() {
  return useQuery({
    queryKey: ['contact-lists'],
    queryFn: contactListsApi.getAll,
  });
}

export function useCreateContactList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      contactListsApi.create(name, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] });
      toast({
        title: 'List created',
        description: 'The contact list has been created',
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

export function useAddContactsToList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, contactIds }: { listId: string; contactIds: string[] }) =>
      contactListsApi.addContacts(listId, contactIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] });
      toast({
        title: 'Contacts added',
        description: 'Contacts have been added to the list',
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
