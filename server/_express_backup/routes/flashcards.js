import { Router } from 'express';
import { db } from '../database.js';
import { authMiddleware } from '../authMiddleware.js';
import { validateStudyScore, sendError, sendSuccess } from '../middleware/validate.js';

export const flashcardRouter = Router();
flashcardRouter.use(authMiddleware);

// ═══════════════════════════════════════════════════════════════
//  SM-2 Algorithm Constants
// ═══════════════════════════════════════════════════════════════
const MAX_INTERVAL_DAYS = 365; // 🛑 Cap de 1 ano para evitar overflow exponencial
const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;

// ── Helper: verifica se o flashcard pertence ao usuário via cadeia ──
async function verifyCardOwnership(cardId, userId) {
  const flashcards = await db.get('flashcards');
  const card = flashcards.find((c) => c.id === cardId);
  if (!card) return { card: null, error: 'Flashcard não encontrado' };

  const notebooks = await db.get('notebooks');
  const notebook = notebooks.find((nb) => nb.id === card.notebookId && nb.userId === userId);
  if (!notebook) return { card: null, error: 'Acesso negado' };

  return { card, error: null };
}

// ═══════════════════════════════════════════════════════════════
//  Algoritmo SuperMemo-2 (SM-2) com proteção contra overflow
// ═══════════════════════════════════════════════════════════════
function computeSM2(card, score) {
  let { repetitions, interval, easeFactor } = card;

  if (score >= 3) {
    // Resposta correta
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions++;
  } else {
    // Resposta incorreta — reseta
    repetitions = 0;
    interval = 1;
  }

  // 🛑 CAP de segurança: impede que o intervalo ultrapasse 1 ano
  if (interval > MAX_INTERVAL_DAYS) {
    interval = MAX_INTERVAL_DAYS;
  }

  // Atualiza ease factor com a fórmula SM-2
  easeFactor = easeFactor + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02));
  if (easeFactor < MIN_EASE_FACTOR) {
    easeFactor = MIN_EASE_FACTOR;
  }

  // Calcula próxima data de revisão
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return {
    repetitions,
    interval,
    easeFactor: Math.round(easeFactor * 100) / 100, // Arredonda para 2 casas
    nextReviewDate: nextReviewDate.toISOString(),
  };
}

// ── GET /notebooks/:notebookId/flashcards ──
flashcardRouter.get('/notebooks/:notebookId/flashcards', async (req, res) => {
  try {
    const notebooks = await db.get('notebooks');
    const notebook = notebooks.find(
      (nb) => nb.id === req.params.notebookId && nb.userId === req.user.id,
    );
    if (!notebook) return sendError(res, 404, 'Caderno não encontrado');

    const flashcards = await db.get('flashcards');
    const filtered = flashcards.filter((c) => c.notebookId === req.params.notebookId);
    return sendSuccess(res, filtered);
  } catch (error) {
    console.error('Erro ao listar flashcards do caderno:', error);
    return sendError(res, 500, 'Erro ao listar flashcards do caderno');
  }
});

// ── PUT /flashcards/:cardId (atualizar front/back) ──
flashcardRouter.put('/flashcards/:cardId', async (req, res) => {
  try {
    const { card, error } = await verifyCardOwnership(req.params.cardId, req.user.id);
    if (error) {
      const status = error === 'Acesso negado' ? 403 : 404;
      return sendError(res, status, error);
    }

    const { front, back } = req.body;
    const updates = {};
    if (front !== undefined) updates.front = front;
    if (back !== undefined) updates.back = back;

    if (Object.keys(updates).length === 0) {
      return sendError(res, 400, 'Nenhum campo para atualizar. Envie front e/ou back.');
    }

    const updatedCard = await db.update('flashcards', req.params.cardId, updates);
    return sendSuccess(res, updatedCard);
  } catch (error) {
    console.error('Erro ao atualizar flashcard:', error);
    return sendError(res, 500, 'Erro ao atualizar flashcard');
  }
});

// ── POST /flashcards/:cardId/review (SM-2) ──
flashcardRouter.post('/flashcards/:cardId/review', validateStudyScore, async (req, res) => {
  try {
    const { card, error } = await verifyCardOwnership(req.params.cardId, req.user.id);
    if (error) {
      const status = error === 'Acesso negado' ? 403 : 404;
      return sendError(res, status, error);
    }

    const sm2Result = computeSM2(card, req.body.score);
    const updatedCard = await db.update('flashcards', req.params.cardId, sm2Result);

    return sendSuccess(res, updatedCard);
  } catch (error) {
    console.error('Erro ao processar revisão do flashcard:', error);
    return sendError(res, 500, 'Erro ao processar revisão do flashcard');
  }
});
