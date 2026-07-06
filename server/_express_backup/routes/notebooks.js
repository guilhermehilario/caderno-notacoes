import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../database.js';
import { authMiddleware } from '../authMiddleware.js';
import { validateBody, sendError, sendSuccess } from '../middleware/validate.js';

export const notebookRouter = Router();

// Aplica authMiddleware em TODAS as rotas deste módulo
notebookRouter.use(authMiddleware);

// ── Helpers ──

async function enrichNotebook(notebook) {
  const leaves = await db.get('leaves');
  const leavesCount = leaves.filter((l) => l.notebookId === notebook.id).length;
  return { ...notebook, leavesCount };
}

async function findUserNotebook(notebookId, userId) {
  const notebooks = await db.get('notebooks');
  return notebooks.find((nb) => nb.id === notebookId && nb.userId === userId) || null;
}

// ── GET /notebooks ──
notebookRouter.get('/', async (req, res) => {
  try {
    const notebooks = await db.get('notebooks');
    const userNotebooks = notebooks.filter((nb) => nb.userId === req.user.id);
    const enriched = await Promise.all(userNotebooks.map(enrichNotebook));
    return sendSuccess(res, enriched);
  } catch (error) {
    console.error('Erro ao listar cadernos:', error);
    return sendError(res, 500, 'Erro ao listar cadernos');
  }
});

// ── GET /notebooks/:id ──
notebookRouter.get('/:id', async (req, res) => {
  try {
    const notebook = await findUserNotebook(req.params.id, req.user.id);
    if (!notebook) return sendError(res, 404, 'Caderno não encontrado');

    const enriched = await enrichNotebook(notebook);
    return sendSuccess(res, enriched);
  } catch (error) {
    console.error('Erro ao obter caderno:', error);
    return sendError(res, 500, 'Erro ao obter caderno');
  }
});

// ── POST /notebooks ──
notebookRouter.post('/', validateBody('title', 'color'), async (req, res) => {
  try {
    const { title, description, color } = req.body;

    if (title.length > 50) {
      return sendError(res, 400, 'Título muito longo (máx. 50 caracteres)');
    }

    const newNotebook = {
      id: crypto.randomUUID(),
      userId: req.user.id,
      title,
      description: description || null,
      color,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert('notebooks', newNotebook);
    return res.status(201).json({ ...newNotebook, leavesCount: 0 });
  } catch (error) {
    console.error('Erro ao criar caderno:', error);
    return sendError(res, 500, 'Erro ao criar caderno');
  }
});

// ── PUT /notebooks/:id ──
notebookRouter.put('/:id', async (req, res) => {
  try {
    const notebook = await findUserNotebook(req.params.id, req.user.id);
    if (!notebook) return sendError(res, 404, 'Caderno não encontrado');

    const { title, description, color } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (color !== undefined) updates.color = color;

    const updated = await db.update('notebooks', req.params.id, updates);
    const enriched = await enrichNotebook(updated);
    return sendSuccess(res, enriched);
  } catch (error) {
    console.error('Erro ao atualizar caderno:', error);
    return sendError(res, 500, 'Erro ao atualizar caderno');
  }
});

// ── DELETE /notebooks/:id ──
notebookRouter.delete('/:id', async (req, res) => {
  try {
    const notebook = await findUserNotebook(req.params.id, req.user.id);
    if (!notebook) return sendError(res, 404, 'Caderno não encontrado');

    // Cascata: deleta folhas e flashcards associados
    const leaves = await db.get('leaves');
    const remainingLeaves = leaves.filter((l) => l.notebookId !== req.params.id);
    await db.save('leaves', remainingLeaves);

    const flashcards = await db.get('flashcards');
    const remainingFlashcards = flashcards.filter((c) => c.notebookId !== req.params.id);
    await db.save('flashcards', remainingFlashcards);

    // Cascata: deleta sessões de estudo
    const sessions = await db.get('studySessions');
    const remainingSessions = sessions.filter((s) => s.notebookId !== req.params.id);
    await db.save('studySessions', remainingSessions);

    await db.delete('notebooks', req.params.id);
    return res.status(204).end();
  } catch (error) {
    console.error('Erro ao deletar caderno:', error);
    return sendError(res, 500, 'Erro ao deletar caderno');
  }
});
