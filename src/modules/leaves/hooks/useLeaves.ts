import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import leafService from '../services/leafService';
import type { CreateLeafInput, UpdateLeafInput, Leaf } from '../types';
import type { Flashcard } from '../../study/types';

export function useLeaves(notebookId: string) {
  const queryClient = useQueryClient();

  const leavesQuery = useQuery({
    queryKey: ['notebooks', notebookId, 'leaves'],
    queryFn: () => leafService.getLeaves(notebookId),
    enabled: !!notebookId,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateLeafInput) => leafService.createLeaf(notebookId, data),
    onSuccess: (newLeaf) => {
      // ⚡ Adiciona a nova folha ao cache + incrementa contagem — sem refetch
      queryClient.setQueryData<Leaf[]>(['notebooks', notebookId, 'leaves'], (old) => [
        ...(old || []),
        newLeaf,
      ]);
      queryClient.setQueryData(['notebooks', notebookId], (old: { leavesCount: number } | undefined) => {
        if (!old) return old;
        return { ...old, leavesCount: old.leavesCount + 1 };
      });
    },
  });

  return {
    leaves: leavesQuery.data || [],
    isLoading: leavesQuery.isLoading,
    error: leavesQuery.error,
    createLeaf: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}

export function useLeaf(leafId: string) {
  const queryClient = useQueryClient();

  const leafQuery = useQuery({
    queryKey: ['leaves', leafId],
    queryFn: () => leafService.getLeaf(leafId),
    enabled: !!leafId,
    staleTime: 30_000,
    refetchOnWindowFocus: false, // Evita refetch ao focar janela durante edição
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateLeafInput) => leafService.updateLeaf(leafId, data),
    onSuccess: (updatedLeaf) => {
      // Não chamamos setQueryData aqui para evitar que o EditorView
      // re-renderize inteiro a cada autosave. O EditorView já gerencia
      // seu estado local (localTitle, localContent) como fonte da verdade.
      // O cache será atualizado naturalmente na próxima navegação.
      
      // Apenas invalida a lista para manter títulos sincronizados no menu lateral
      queryClient.invalidateQueries({
        queryKey: ['notebooks', updatedLeaf.notebookId, 'leaves'],
      });
      // Marca a consulta individual como desatualizada (sem refetch imediato)
      // para que na próxima visita os dados frescos sejam carregados
      queryClient.invalidateQueries({
        queryKey: ['leaves', leafId],
        refetchType: 'none',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => leafService.deleteLeaf(leafId),
    onSuccess: () => {
      if (leafQuery.data) {
        const notebookId = leafQuery.data.notebookId;
        // ⚡ Remove a folha do cache + decrementa contagem — sem refetch
        queryClient.setQueryData<Leaf[]>(['notebooks', notebookId, 'leaves'], (old) =>
          old?.filter((l) => l.id !== leafId) ?? old,
        );
        queryClient.setQueryData(['notebooks', notebookId], (old: { leavesCount: number } | undefined) => {
          if (!old) return old;
          return { ...old, leavesCount: Math.max(0, old.leavesCount - 1) };
        });
        queryClient.removeQueries({ queryKey: ['leaves', leafId] });
      }
    },
  });

  const summaryMutation = useMutation({
    mutationFn: () => leafService.generateAISummary(leafId),
    onSuccess: (data) => {
      queryClient.setQueryData(['leaves', leafId], (old: { summary?: string } | undefined) => {
        if (!old) return old;
        return { ...old, summary: data.summary };
      });
    },
  });

  const flashcardsMutation = useMutation({
    mutationFn: () => leafService.generateAIFlashcards(leafId),
    onSuccess: (flashcards) => {
      // ⚡ Define os flashcards diretamente no cache — sem refetch
      queryClient.setQueryData<Flashcard[]>(['leaves', leafId, 'flashcards'], flashcards);
    },
  });

  return {
    leaf: leafQuery.data,
    isLoading: leafQuery.isLoading,
    error: leafQuery.error,
    updateLeaf: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteLeaf: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    
    generateAISummary: summaryMutation.mutateAsync,
    isGeneratingSummary: summaryMutation.isPending,
    
    generateAIFlashcards: flashcardsMutation.mutateAsync,
    isGeneratingFlashcards: flashcardsMutation.isPending,
  };
}
export default useLeaves;
