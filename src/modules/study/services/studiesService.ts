import { api } from '../../../core/api/client';
import type { StudyContent } from '../types';

export const studiesService = {
  async getContent(notebookId?: string): Promise<StudyContent> {
    const params = notebookId ? { notebookId } : {};
    const response = await api.get<StudyContent>('/studies/content', { params });
    return response.data;
  },

  async getStats(): Promise<{
    totalFlashcards: number;
    flashcardsDue: number;
    totalQuestions: number;
    totalMockExams: number;
  }> {
    const response = await api.get<{
      totalFlashcards: number;
      flashcardsDue: number;
      totalQuestions: number;
      totalMockExams: number;
    }>('/studies/stats');
    return response.data;
  },
};

export default studiesService;
