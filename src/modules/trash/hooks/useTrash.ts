import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import trashService from '../services/trashService';

export function useTrash() {
  return useQuery({
    queryKey: ['trash'],
    queryFn: () => trashService.getTrash(),
    staleTime: 30_000,
  });
}

export function useSoftDeleteNotebook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notebookId: string) => trashService.softDeleteNotebook(notebookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });
}

export function useSoftDeleteLeaf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leafId: string) => trashService.softDeleteLeaf(leafId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });
}

export function useRestoreNotebook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notebookId: string) => trashService.restoreNotebook(notebookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });
}

export function useRestoreLeaf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leafId: string) => trashService.restoreLeaf(leafId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });
}

export function usePermanentDeleteNotebook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notebookId: string) => trashService.permanentDeleteNotebook(notebookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });
}

export function usePermanentDeleteLeaf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leafId: string) => trashService.permanentDeleteLeaf(leafId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });
}

export function useCleanTrash() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => trashService.cleanOldTrash(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });
}
