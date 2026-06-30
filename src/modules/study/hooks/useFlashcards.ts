import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import studyService from '../services/studyService';
import type { StudyScore } from '../types';

export function useLeafFlashcards(leafId: string) {
  return useQuery({
    queryKey: ['leaves', leafId, 'flashcards'],
    queryFn: () => studyService.getLeafFlashcards(leafId),
    enabled: !!leafId,
    staleTime: 30_000, // Evita refetch ao navegar entre abas ou voltar para o editor
  });
}

export function useNotebookFlashcards(notebookId: string) {
  return useQuery({
    queryKey: ['notebook-flashcards', notebookId],
    queryFn: () => studyService.getNotebookFlashcards(notebookId),
    enabled: !!notebookId,
    // 💡 ISSO EVITA O ESTADO DE LOADING DURANTE ATUALIZAÇÕES EM BACKGROUND:
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: false,
  });
}

export function useSubmitCardScore(leafId?: string, notebookId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cardId, score }: { cardId: string; score: StudyScore }) =>
      studyService.submitFlashcardScore(cardId, score),
    onSuccess: () => {
      // Invalida os caches relacionados para manter os dados atualizados
      if (leafId) {
        queryClient.invalidateQueries({ queryKey: ['leaves', leafId, 'flashcards'] });
      }
      if (notebookId) {
        queryClient.invalidateQueries({ queryKey: ['notebooks', notebookId, 'flashcards'] });
      }
    },
  });
}
