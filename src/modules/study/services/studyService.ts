import { api } from '../../../core/api/client';
import type { Flashcard, StudyScore } from '../types';

export const studyService = {
  async getLeafFlashcards(leafId: string): Promise<Flashcard[]> {
    const response = await api.get<Flashcard[]>(`/leaves/${leafId}/flashcards`);
    return response.data;
  },

  async getNotebookFlashcards(notebookId: string): Promise<Flashcard[]> {
    const response = await api.get<Flashcard[]>(`/notebooks/${notebookId}/flashcards`);
    return response.data;
  },

  async submitFlashcardScore(
    cardId: string,
    score: StudyScore
  ): Promise<Flashcard> {
    const response = await api.post<Flashcard>(`/flashcards/${cardId}/review`, { score });
    return response.data;
  },
};
export default studyService;
