import { create } from 'zustand';

/*
 * 🧠 studyStore – Isolamento de Estado da Sessão de Estudos
 *
 * Gerencia o estado da sessão ATUAL indexada por `notebookId`.
 * Como a store vive FORA do ciclo de vida dos componentes React,
 * mesmo que o ecossistema (React Query, React Router) dispare
 * re-renderizações em cascata nos componentes pai, o progresso
 * do usuário (currentIndex, reviewedCount, showAnswer) permanece
 * intacto, eliminando o reset do card para o índice 0.
 *
 * O acoplamento por notebookId garante que, ao navegar para o
 * estudo de outro caderno, o estado não vaze entre sessões.
 */

interface StudySession {
  currentIndex: number;
  reviewedCount: number;
  showAnswer: boolean;
}

interface StudySessionState {
  sessions: Record<string, StudySession>;
}

interface StudySessionActions {
  setCurrentIndex: (notebookId: string, index: number) => void;
  setReviewedCount: (notebookId: string, count: number) => void;
  setShowAnswer: (notebookId: string, show: boolean) => void;
  /** Reseta APENAS a sessão do notebook informado */
  resetSession: (notebookId: string) => void;
}

const defaultSession = (): StudySession => ({
  currentIndex: 0,
  reviewedCount: 0,
  showAnswer: false,
});

export const useStudyStore = create<StudySessionState & StudySessionActions>()(
  (set) => ({
    sessions: {},

    setCurrentIndex: (notebookId, index) =>
      set((state) => ({
        sessions: {
          ...state.sessions,
          [notebookId]: {
            ...state.sessions[notebookId] ?? defaultSession(),
            currentIndex: index,
          },
        },
      })),

    setReviewedCount: (notebookId, count) =>
      set((state) => ({
        sessions: {
          ...state.sessions,
          [notebookId]: {
            ...state.sessions[notebookId] ?? defaultSession(),
            reviewedCount: count,
          },
        },
      })),

    setShowAnswer: (notebookId, show) =>
      set((state) => ({
        sessions: {
          ...state.sessions,
          [notebookId]: {
            ...state.sessions[notebookId] ?? defaultSession(),
            showAnswer: show,
          },
        },
      })),

    resetSession: (notebookId) =>
      set((state) => ({
        sessions: {
          ...state.sessions,
          [notebookId]: defaultSession(),
        },
      })),
  }),
);
