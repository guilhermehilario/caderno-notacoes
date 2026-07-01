import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import leafService from "../services/leafService";
import type { CreateLeafInput, UpdateLeafInput, Leaf } from "../types";
import type { Flashcard } from "../../study/types";

export function useLeaves(notebookId: string) {
  const queryClient = useQueryClient();

  const leavesQuery = useQuery({
    queryKey: ["notebooks", notebookId, "leaves"],
    queryFn: () => leafService.getLeaves(notebookId),
    enabled: !!notebookId,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateLeafInput) =>
      leafService.createLeaf(notebookId, data),
    onSuccess: (newLeaf) => {
      // ⚡ Adiciona a nova folha ao cache + incrementa contagem — sem refetch
      queryClient.setQueryData<Leaf[]>(
        ["notebooks", notebookId, "leaves"],
        (old) => {
          if (!old) return [newLeaf];
          const alreadyExists = old.some((leaf) => leaf.id === newLeaf.id);
          return alreadyExists ? old : [...old, newLeaf];
        },
      );
      queryClient.setQueryData(
        ["notebooks", notebookId],
        (old: { leavesCount: number } | undefined) => {
          if (!old) return old;
          return { ...old, leavesCount: old.leavesCount + 1 };
        },
      );
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
    queryKey: ["leaves", leafId],
    queryFn: () => leafService.getLeaf(leafId),
    enabled: !!leafId,
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false, // Evita refetch ao focar janela durante edição
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateLeafInput) => leafService.updateLeaf(leafId, data),
    onSuccess: (updatedLeaf) => {
      // ⚡ NÃO atualizamos o cache individual ['leaves', leafId] propositalmente.
      // Fazer setQueryData com um novo objeto faria o useQuery disparar
      // re-render em toda a árvore do EditorView, recriando o editor.
      // O EditorView já gerencia estado local como fonte da verdade.

      // Apenas atualiza o título na lista de leaves para manter
      // o menu lateral sincronizado — sem disparar requisição HTTP.
      queryClient.setQueryData<Leaf[]>(
        ["notebooks", updatedLeaf.notebookId, "leaves"],
        (old) =>
          old?.map((leaf) => {
            if (leaf.id !== leafId) return leaf;
            if (leaf.title === updatedLeaf.title) return leaf;
            return {
              ...leaf,
              title: updatedLeaf.title,
              updatedAt: updatedLeaf.updatedAt ?? leaf.updatedAt,
            };
          }) ?? old,
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => leafService.deleteLeaf(leafId),
    onSuccess: () => {
      if (leafQuery.data) {
        const notebookId = leafQuery.data.notebookId;
        // ⚡ Remove a folha do cache + decrementa contagem — sem refetch
        queryClient.setQueryData<Leaf[]>(
          ["notebooks", notebookId, "leaves"],
          (old) => old?.filter((l) => l.id !== leafId) ?? old,
        );
        queryClient.setQueryData(
          ["notebooks", notebookId],
          (old: { leavesCount: number } | undefined) => {
            if (!old) return old;
            return { ...old, leavesCount: Math.max(0, old.leavesCount - 1) };
          },
        );
        queryClient.removeQueries({ queryKey: ["leaves", leafId] });
      }
    },
  });

  const summaryMutation = useMutation({
    mutationFn: () => leafService.generateAISummary(leafId),
    onSuccess: (data) => {
      queryClient.setQueryData(
        ["leaves", leafId],
        (old: { summary?: string } | undefined) => {
          if (!old) return old;
          if (old.summary === data.summary) return old;
          return { ...old, summary: data.summary };
        },
      );
    },
  });

  const flashcardsMutation = useMutation({
    mutationFn: () => leafService.generateAIFlashcards(leafId),
    onSuccess: (flashcards) => {
      // ⚡ Define os flashcards diretamente no cache — sem refetch
      queryClient.setQueryData<Flashcard[]>(
        ["leaves", leafId, "flashcards"],
        (old) => {
          if (!old) return flashcards;
          const isSame =
            old.length === flashcards.length &&
            old.every((card, index) => {
              const nextCard = flashcards[index];
              return (
                card.id === nextCard?.id &&
                card.front === nextCard?.front &&
                card.back === nextCard?.back
              );
            });
          return isSame ? old : flashcards;
        },
      );
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
