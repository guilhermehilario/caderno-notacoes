import { z } from 'zod';

export const FlashcardSchema = z.object({
  id: z.string().uuid(),
  leafId: z.string().uuid(),
  notebookId: z.string().uuid(),
  front: z.string().min(1, 'A pergunta do card é obrigatória').max(500, 'Pergunta muito longa'),
  back: z.string().min(1, 'A resposta do card é obrigatória').max(1000, 'Resposta muito longa'),
  
  // Parâmetros do algoritmo SuperMemo-2 (SM-2)
  repetitions: z.number().int().nonnegative().default(0),
  interval: z.number().int().nonnegative().default(0), // em dias
  easeFactor: z.number().nonnegative().default(2.5),
  
  nextReviewDate: z.string().datetime().or(z.date()),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
});

export type Flashcard = z.infer<typeof FlashcardSchema>;

export const CreateFlashcardSchema = z.object({
  front: z.string().min(1, 'A pergunta do card é obrigatória'),
  back: z.string().min(1, 'A resposta do card é obrigatória'),
});

export type CreateFlashcardInput = z.infer<typeof CreateFlashcardSchema>;

export const UpdateFlashcardSchema = CreateFlashcardSchema.partial().extend({
  repetitions: z.number().int().nonnegative().optional(),
  interval: z.number().int().nonnegative().optional(),
  easeFactor: z.number().nonnegative().optional(),
  nextReviewDate: z.string().datetime().or(z.date()).optional(),
});

export type UpdateFlashcardInput = z.infer<typeof UpdateFlashcardSchema>;

// Tipagem de resposta do algoritmo de estudo
export type StudyScore = 0 | 1 | 2 | 3 | 4 | 5; 
// 0: "Esqueci totalmente" -> 5: "Lembrei perfeitamente e sem esforço"

export interface StudySessionState {
  notebookId: string;
  cards: Flashcard[];
  currentIndex: number;
  completedIds: string[];
  sessionStartedAt: Date | null;
  scoreHistory: Record<string, StudyScore>;
}
