import { Router } from 'express';
import { db } from '../database.js';
import { authMiddleware } from '../authMiddleware.js';
import { sendError, sendSuccess } from '../middleware/validate.js';

export const studyRouter = Router();
studyRouter.use(authMiddleware);

// ═══════════════════════════════════════════════════════════════
//  SESSÃO DE ESTUDO (persistência)
// ═══════════════════════════════════════════════════════════════

// ── PUT /study-sessions/:notebookId ──
studyRouter.put('/study-sessions/:notebookId', async (req, res) => {
  try {
    const userId = req.user.id;
    const notebookId = req.params.notebookId;

    // Verifica ownership do notebook
    const notebooks = await db.get('notebooks');
    const notebook = notebooks.find((nb) => nb.id === notebookId && nb.userId === userId);
    if (!notebook) return sendError(res, 404, 'Caderno não encontrado');

    const { currentIndex, reviewedCount, showAnswer, sessionActive, flashcards, completedCardIds, scores } = req.body;

    const sessions = await db.get('studySessions');
    const existingIndex = sessions.findIndex(
      (s) => s.notebookId === notebookId && s.userId === userId,
    );

    const sessionData = {
      notebookId,
      userId,
      currentIndex: currentIndex ?? 0,
      reviewedCount: reviewedCount ?? 0,
      showAnswer: showAnswer ?? false,
      sessionActive: sessionActive ?? false,
      flashcards: flashcards ?? [],
      completedCardIds: completedCardIds ?? [],
      scores: scores ?? {},
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      sessions[existingIndex] = { ...sessions[existingIndex], ...sessionData };
      await db.save('studySessions', sessions);
      return sendSuccess(res, sessions[existingIndex]);
    }

    await db.insert('studySessions', {
      ...sessionData,
      createdAt: new Date().toISOString(),
    });
    return res.status(201).json(sessionData);
  } catch (error) {
    console.error('Erro ao salvar sessão:', error);
    return sendError(res, 500, 'Erro ao salvar sessão de estudo');
  }
});

// ── GET /study-sessions/:notebookId ──
studyRouter.get('/study-sessions/:notebookId', async (req, res) => {
  try {
    const userId = req.user.id;
    const notebookId = req.params.notebookId;

    const sessions = await db.get('studySessions');
    const session = sessions.find(
      (s) => s.notebookId === notebookId && s.userId === userId,
    );

    if (!session) {
      return sendError(res, 404, 'Nenhuma sessão de estudo encontrada para este caderno');
    }

    return sendSuccess(res, session);
  } catch (error) {
    console.error('Erro ao carregar sessão:', error);
    return sendError(res, 500, 'Erro ao carregar sessão de estudo');
  }
});

// ── DELETE /study-sessions/:notebookId ──
studyRouter.delete('/study-sessions/:notebookId', async (req, res) => {
  try {
    const userId = req.user.id;
    const notebookId = req.params.notebookId;

    const sessions = await db.get('studySessions');
    const filtered = sessions.filter(
      (s) => !(s.notebookId === notebookId && s.userId === userId),
    );
    await db.save('studySessions', filtered);

    return res.status(204).end();
  } catch (error) {
    console.error('Erro ao deletar sessão:', error);
    return sendError(res, 500, 'Erro ao deletar sessão de estudo');
  }
});

// ═══════════════════════════════════════════════════════════════
//  ESTATÍSTICAS DE ESTUDO
// ═══════════════════════════════════════════════════════════════

// ── GET /study/stats ──
studyRouter.get('/study/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    const flashcards = await db.get('flashcards');
    const notebooks = await db.get('notebooks');
    const userNotebookIds = notebooks
      .filter((nb) => nb.userId === userId)
      .map((nb) => nb.id);

    const userCards = flashcards.filter((c) => userNotebookIds.includes(c.notebookId));

    // Data de hoje (início do dia)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Cards revisados hoje (inclui score < 3 que reseta repetitions)
    const reviewedToday = userCards.filter((c) => {
      const updated = new Date(c.updatedAt);
      if (updated < todayStart) return false;
      if (c.repetitions > 0) return true;
      const created = new Date(c.createdAt);
      return created < todayStart;
    });

    // Cards disponíveis para revisão
    const now = new Date();
    const dueForReview = userCards.filter((c) => new Date(c.nextReviewDate) <= now);

    // Taxa de acerto via easeFactor médio
    const totalReviewed = userCards.filter((c) => c.repetitions > 0).length;
    const avgEaseFactor =
      totalReviewed > 0
        ? userCards
            .filter((c) => c.repetitions > 0)
            .reduce((sum, c) => sum + c.easeFactor, 0) / totalReviewed
        : 2.5;

    const accuracyRate = Math.min(
      100,
      Math.max(0, Math.round(((avgEaseFactor - 1.3) / (3.3 - 1.3)) * 100)),
    );

    // Distribuição por notebook
    const perNotebook = userNotebookIds
      .map((nbId) => {
        const notebook = notebooks.find((nb) => nb.id === nbId);
        const nbCards = userCards.filter((c) => c.notebookId === nbId);
        const nbReviewedToday = reviewedToday.filter((c) => c.notebookId === nbId);
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

    return sendSuccess(res, {
      totalCards: userCards.length,
      reviewedToday: reviewedToday.length,
      dueForReview: dueForReview.length,
      accuracyRate,
      avgEaseFactor: Math.round(avgEaseFactor * 100) / 100,
      perNotebook,
    });
  } catch (error) {
    console.error('Erro ao obter stats:', error);
    return sendError(res, 500, 'Erro ao obter estatísticas de estudo');
  }
});
