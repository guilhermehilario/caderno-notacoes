import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import leafService from '../services/leafService';
import type { CreateLeafInput, UpdateLeafInput } from '../types';

export function useLeaves(notebookId: string) {
  const queryClient = useQueryClient();

  const leavesQuery = useQuery({
    queryKey: ['notebooks', notebookId, 'leaves'],
    queryFn: () => leafService.getLeaves(notebookId),
    enabled: !!notebookId,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateLeafInput) => leafService.createLeaf(notebookId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks', notebookId, 'leaves'] });
      queryClient.invalidateQueries({ queryKey: ['notebooks', notebookId] }); // Atualiza metadados como folhas acumuladas
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
        queryClient.invalidateQueries({
          queryKey: ['notebooks', leafQuery.data.notebookId, 'leaves'],
        });
        queryClient.invalidateQueries({
          queryKey: ['notebooks', leafQuery.data.notebookId],
        });
      }
    },
  });

  const summaryMutation = useMutation({
    mutationFn: () => leafService.generateAISummary(leafId),
    onSuccess: (data) => {
      queryClient.setQueryData(['leaves', leafId], (old: any) => {
        if (!old) return old;
        return { ...old, summary: data.summary };
      });
    },
  });

  const flashcardsMutation = useMutation({
    mutationFn: () => leafService.generateAIFlashcards(leafId),
    onSuccess: () => {
      // Invalida cache de flashcards desta folha
      queryClient.invalidateQueries({ queryKey: ['leaves', leafId, 'flashcards'] });
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
