import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  contactsBackendApi,
  contactListsBackendApi,
  Contact,
  ContactList,
  CreateContactRequest,
} from '@/lib/backend-api';
import { toast } from '@/hooks/use-toast';

export function useContactsFromBackend(params?: { tags?: string[]; opt_in?: boolean }) {
  return useQuery({
    queryKey: ['contacts', params],
    queryFn: () => contactsBackendApi.getAll(params),
  });
}

export function useContactFromBackend(id: string) {
  return useQuery({
    queryKey: ['contacts', id],
    queryFn: () => contactsBackendApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateContactBackend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateContactRequest) => contactsBackendApi.create(data),
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

export function useImportContactsBackend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contacts: CreateContactRequest[]) =>
      contactsBackendApi.import({ contacts }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({
        title: 'Contacts imported',
        description: `${data.imported} imported, ${data.skipped} skipped`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Import failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateContactBackend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateContactRequest> }) =>
      contactsBackendApi.update(id, data),
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

export function useDeleteContactBackend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => contactsBackendApi.delete(id),
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
export function useContactListsFromBackend() {
  return useQuery({
    queryKey: ['contact-lists'],
    queryFn: () => contactListsBackendApi.getAll(),
  });
}

export function useContactListContactsFromBackend(listId: string) {
  return useQuery({
    queryKey: ['contact-lists', listId, 'contacts'],
    queryFn: () => contactListsBackendApi.getContacts(listId),
    enabled: !!listId,
  });
}

export function useCreateContactListBackend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      contactListsBackendApi.create(data),
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

export function useAddContactsToListBackend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, contactIds }: { listId: string; contactIds: string[] }) =>
      contactListsBackendApi.addContacts(listId, contactIds),
    onSuccess: (_, { listId }) => {
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] });
      queryClient.invalidateQueries({ queryKey: ['contact-lists', listId, 'contacts'] });
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
