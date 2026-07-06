import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface StudyStats {
  totalCards: number;
  reviewedToday: number;
  dueForReview: number;
  accuracyRate: number;
  avgEaseFactor: number;
  perNotebook: Array<{
    notebookId: string;
    notebookTitle: string;
    notebookColor: string;
    totalCards: number;
    reviewedToday: number;
    dueForReview: number;
  }>;
}

@Injectable()
export class StudyService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Study Sessions ──

  async saveSession(
    notebookId: string,
    userId: string,
    data: {
      currentIndex?: number;
      reviewedCount?: number;
      showAnswer?: boolean;
      sessionActive?: boolean;
      flashcards?: any[];
      completedCardIds?: string[];
      scores?: Record<string, number>;
    },
  ) {
    const notebook = await this.prisma.notebook.findFirst({
      where: { id: notebookId, userId },
    });
    if (!notebook) throw new NotFoundException('Caderno não encontrado');

    return this.prisma.studySession.upsert({
      where: {
        notebookId_userId: { notebookId, userId },
      },
      create: {
        notebookId,
        userId,
        currentIndex: data.currentIndex ?? 0,
        reviewedCount: data.reviewedCount ?? 0,
        showAnswer: data.showAnswer ?? false,
        sessionActive: data.sessionActive ?? false,
        flashcards: JSON.stringify(data.flashcards ?? []),
        completedCardIds: JSON.stringify(data.completedCardIds ?? []),
        scores: JSON.stringify(data.scores ?? {}),
      },
      update: {
        currentIndex: data.currentIndex,
        reviewedCount: data.reviewedCount,
        showAnswer: data.showAnswer,
        sessionActive: data.sessionActive,
        flashcards: JSON.stringify(data.flashcards ?? []),
        completedCardIds: JSON.stringify(data.completedCardIds ?? []),
        scores: JSON.stringify(data.scores ?? {}),
      },
    });
  }

  async loadSession(notebookId: string, userId: string) {
    const session = await this.prisma.studySession.findUnique({
      where: {
        notebookId_userId: { notebookId, userId },
      },
    });

    if (!session) {
      throw new NotFoundException(
        'Nenhuma sessão de estudo encontrada para este caderno',
      );
    }

    return {
      ...session,
      flashcards: JSON.parse(session.flashcards),
      completedCardIds: JSON.parse(session.completedCardIds),
      scores: JSON.parse(session.scores),
    };
  }

  async deleteSession(notebookId: string, userId: string): Promise<void> {
    try {
      await this.prisma.studySession.delete({
        where: {
          notebookId_userId: { notebookId, userId },
        },
      });
    } catch {
      // Se não existe, apenas ignora
    }
  }

  // ── Stats ──

  async getStats(userId: string): Promise<StudyStats> {
    const notebooks = await this.prisma.notebook.findMany({
      where: { userId },
    });

    const userNotebookIds = notebooks.map((nb) => nb.id);

    const allFlashcards = await this.prisma.flashcard.findMany({
      where: { notebookId: { in: userNotebookIds } },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const reviewedToday = allFlashcards.filter((c) => {
      const updated = new Date(c.updatedAt);
      if (updated < todayStart) return false;
      if (c.repetitions > 0) return true;
      const created = new Date(c.createdAt);
      return created < todayStart;
    });

    const now = new Date();
    const dueForReview = allFlashcards.filter(
      (c) => new Date(c.nextReviewDate) <= now,
    );

    const totalReviewed = allFlashcards.filter((c) => c.repetitions > 0).length;
    const avgEaseFactor =
      totalReviewed > 0
        ? allFlashcards
            .filter((c) => c.repetitions > 0)
            .reduce((sum, c) => sum + c.easeFactor, 0) / totalReviewed
        : 2.5;

    const accuracyRate = Math.min(
      100,
      Math.max(0, Math.round(((avgEaseFactor - 1.3) / (3.3 - 1.3)) * 100)),
    );

    const perNotebook = userNotebookIds
      .map((nbId) => {
        const notebook = notebooks.find((nb) => nb.id === nbId);
        const nbCards = allFlashcards.filter((c) => c.notebookId === nbId);
        const nbReviewedToday = reviewedToday.filter(
          (c) => c.notebookId === nbId,
        );
        const nbDue = dueForReview.filter((c) => c.notebookId === nbId);

        return {
          notebookId: nbId,
          notebookTitle: notebook?.title ?? 'Sem título',
          notebookColor: notebook?.color ?? '#aa3bff',
          totalCards: nbCards.length,
          reviewedToday: nbReviewedToday.length,
          dueForReview: nbDue.length,
        };
      })
      .filter((nb) => nb.totalCards > 0);

    return {
      totalCards: allFlashcards.length,
      reviewedToday: reviewedToday.length,
      dueForReview: dueForReview.length,
      accuracyRate,
      avgEaseFactor: Math.round(avgEaseFactor * 100) / 100,
      perNotebook,
    };
  }
}
