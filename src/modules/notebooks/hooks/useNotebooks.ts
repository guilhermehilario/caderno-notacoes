import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notebookService from '../services/notebookService';
import type { Notebook, CreateNotebookInput, UpdateNotebookInput } from '../types';

export function useNotebooks() {
  const queryClient = useQueryClient();

  const notebooksQuery = useQuery({
    queryKey: ['notebooks'],
    queryFn: () => notebookService.getNotebooks(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateNotebookInput) => notebookService.createNotebook(data),
    onSuccess: (newNotebook) => {
      // ⚡ Adiciona o novo caderno ao cache cirurgicamente — sem refetch
      queryClient.setQueryData<Notebook[]>(['notebooks'], (old) => [...(old || []), newNotebook]);
    },
  });

  return {
    notebooks: notebooksQuery.data || [],
    isLoading: notebooksQuery.isLoading,
    error: notebooksQuery.error,
    createNotebook: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}

export function useNotebook(id: string) {
  const queryClient = useQueryClient();

  const notebookQuery = useQuery({
    queryKey: ['notebooks', id],
    queryFn: () => notebookService.getNotebook(id),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateNotebookInput) => notebookService.updateNotebook(id, data),
    onSuccess: (updatedNotebook) => {
      // ⚡ Atualiza o cache individual + substitui na lista — sem refetch
      queryClient.setQueryData(['notebooks', id], updatedNotebook);
      queryClient.setQueryData<Notebook[]>(['notebooks'], (old) =>
        old?.map((n) => (n.id === id ? updatedNotebook : n)) ?? old,
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => notebookService.deleteNotebook(id),
    onSuccess: () => {
      // ⚡ Remove o caderno do cache + limpa cache individual — sem refetch
      queryClient.setQueryData<Notebook[]>(['notebooks'], (old) =>
        old?.filter((n) => n.id !== id) ?? old,
      );
      queryClient.removeQueries({ queryKey: ['notebooks', id] });
    },
  });

  return {
    notebook: notebookQuery.data,
    isLoading: notebookQuery.isLoading,
    error: notebookQuery.error,
    updateNotebook: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteNotebook: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
