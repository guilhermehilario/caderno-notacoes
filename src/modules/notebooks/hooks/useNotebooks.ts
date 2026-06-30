import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notebookService from '../services/notebookService';
import type { CreateNotebookInput, UpdateNotebookInput } from '../types';

export function useNotebooks() {
  const queryClient = useQueryClient();

  const notebooksQuery = useQuery({
    queryKey: ['notebooks'],
    queryFn: () => notebookService.getNotebooks(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateNotebookInput) => notebookService.createNotebook(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
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
      queryClient.setQueryData(['notebooks', id], updatedNotebook);
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => notebookService.deleteNotebook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
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
