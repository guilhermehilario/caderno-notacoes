import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../database.js';
import { authMiddleware } from '../authMiddleware.js';
import { validateBody, sendError, sendSuccess } from '../middleware/validate.js';

export const leafRouter = Router();
leafRouter.use(authMiddleware);

// ── Ownership Helper (cadeia: leaf → notebook → userId) ──
async function verifyLeafOwnership(leafId, userId) {
  const leaves = await db.get('leaves');
  const leaf = leaves.find((l) => l.id === leafId);
  if (!leaf) return { leaf: null, error: 'Folha não encontrada' };

  const notebooks = await db.get('notebooks');
  const notebook = notebooks.find((nb) => nb.id === leaf.notebookId);
  if (!notebook || notebook.userId !== userId) {
    return { leaf: null, error: 'Acesso negado' };
  }

  return { leaf, error: null };
}

async function verifyNotebookOwnership(notebookId, userId) {
  const notebooks = await db.get('notebooks');
  const notebook = notebooks.find((nb) => nb.id === notebookId && nb.userId === userId);
  return notebook || null;
}

// ── GET /notebooks/:notebookId/leaves ──
leafRouter.get('/notebooks/:notebookId/leaves', async (req, res) => {
  try {
    const notebook = await verifyNotebookOwnership(req.params.notebookId, req.user.id);
    if (!notebook) return sendError(res, 404, 'Caderno não encontrado');

    const leaves = await db.get('leaves');
    const filtered = leaves.filter((l) => l.notebookId === req.params.notebookId);
    return sendSuccess(res, filtered);
  } catch (error) {
    console.error('Erro ao listar folhas:', error);
    return sendError(res, 500, 'Erro ao listar folhas');
  }
});

// ── POST /notebooks/:notebookId/leaves ──
leafRouter.post('/notebooks/:notebookId/leaves', validateBody('title'), async (req, res) => {
  try {
    const notebook = await verifyNotebookOwnership(req.params.notebookId, req.user.id);
    if (!notebook) return sendError(res, 404, 'Caderno não encontrado');

    const { title, content, rawText } = req.body;

    if (title.length > 100) {
      return sendError(res, 400, 'Título muito longo (máx. 100 caracteres)');
    }

    const newLeaf = {
      id: crypto.randomUUID(),
      notebookId: req.params.notebookId,
      title,
      content: content || '',
      rawText: rawText || '',
      summary: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert('leaves', newLeaf);
    return res.status(201).json(newLeaf);
  } catch (error) {
    console.error('Erro ao criar folha:', error);
    return sendError(res, 500, 'Erro ao criar folha');
  }
});

// ── GET /leaves/:leafId ──
leafRouter.get('/leaves/:leafId', async (req, res) => {
  try {
    const { leaf, error } = await verifyLeafOwnership(req.params.leafId, req.user.id);
    if (error) return sendError(res, 404, error);
    return sendSuccess(res, leaf);
  } catch (err) {
    console.error('Erro ao obter folha:', err);
    return sendError(res, 500, 'Erro ao obter folha');
  }
});

// ── PUT /leaves/:leafId ──
leafRouter.put('/leaves/:leafId', async (req, res) => {
  try {
    const { leaf, error } = await verifyLeafOwnership(req.params.leafId, req.user.id);
    if (error) return sendError(res, 404, error);

    const { title, content, rawText, summary } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (rawText !== undefined) updates.rawText = rawText;
    if (summary !== undefined) updates.summary = summary;

    const updated = await db.update('leaves', req.params.leafId, updates);
    return sendSuccess(res, updated);
  } catch (err) {
    console.error('Erro ao editar folha:', err);
    return sendError(res, 500, 'Erro ao editar folha');
  }
});

// ── DELETE /leaves/:leafId ──
leafRouter.delete('/leaves/:leafId', async (req, res) => {
  try {
    const { leaf, error } = await verifyLeafOwnership(req.params.leafId, req.user.id);
    if (error) return sendError(res, 404, error);

    await db.delete('leaves', req.params.leafId);

    // Cascata: deleta flashcards da folha
    const flashcards = await db.get('flashcards');
    const remaining = flashcards.filter((c) => c.leafId !== req.params.leafId);
    await db.save('flashcards', remaining);

    return res.status(204).end();
  } catch (err) {
    console.error('Erro ao deletar folha:', err);
    return sendError(res, 500, 'Erro ao deletar folha');
  }
});

// ── POST /leaves/:leafId/summary (Mockado IA) ──
leafRouter.post('/leaves/:leafId/summary', async (req, res) => {
  try {
    const { leaf, error } = await verifyLeafOwnership(req.params.leafId, req.user.id);
    if (error) return sendError(res, 404, error);

    const cleanTitle = leaf.title;
    const cleanText = leaf.rawText || 'Sem conteúdo adicional.';

    const summaryText = `### Resumo da Aula: ${cleanTitle}\n\nEste resumo foi gerado dinamicamente pela inteligência artificial com base nas notas fornecidas.\n\n- **Conceito Principal**: Foco em ${cleanTitle}.\n- **Ideias Chave**:\n  1. A importância de reter os conceitos práticos e relacioná-los a exemplos do cotidiano.\n  2. Uso de revisões sistemáticas para evitar a curva do esquecimento de Ebbinghaus.\n- **Conteúdo Analisado**: \n  > "${cleanText.substring(0, 150)}${cleanText.length > 150 ? '...' : ''}"\n\n*Utilize os flashcards associados para testar sua memória ativa!*`;

    const updated = await db.update('leaves', req.params.leafId, { summary: summaryText });
    return res.json({ summary: updated.summary });
  } catch (err) {
    console.error('Erro ao gerar resumo:', err);
    return sendError(res, 500, 'Erro ao gerar resumo da folha');
  }
});

// ── POST /leaves/:leafId/flashcards (Mockado IA) ──
leafRouter.post('/leaves/:leafId/flashcards', async (req, res) => {
  try {
    const { leaf, error } = await verifyLeafOwnership(req.params.leafId, req.user.id);
    if (error) return sendError(res, 404, error);

    const mockCards = [
      {
        id: crypto.randomUUID(),
        leafId: leaf.id,
        notebookId: leaf.notebookId,
        front: `Qual é o tema principal abordado na folha "${leaf.title}"?`,
        back: `O tema principal é "${leaf.title}", focado em aprofundar e consolidar este conteúdo de forma sistemática.`,
        repetitions: 0,
        interval: 0,
        easeFactor: 2.5,
        nextReviewDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        leafId: leaf.id,
        notebookId: leaf.notebookId,
        front: `De acordo com as notas de "${leaf.title}", qual é uma boa prática de estudo para este tema?`,
        back: 'Escrever resumos com as próprias palavras e fazer exercícios práticos/simulados logo em seguida.',
        repetitions: 0,
        interval: 0,
        easeFactor: 2.5,
        nextReviewDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        leafId: leaf.id,
        notebookId: leaf.notebookId,
        front: `Qual a importância da repetição espaçada no aprendizado de "${leaf.title}"?`,
        back: 'Ela ajuda a combater a curva do esquecimento, movendo a informação da memória de curto prazo para a de longo prazo.',
        repetitions: 0,
        interval: 0,
        easeFactor: 2.5,
        nextReviewDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const card of mockCards) {
      await db.insert('flashcards', card);
    }

    return res.status(201).json(mockCards);
  } catch (err) {
    console.error('Erro ao gerar flashcards:', err);
    return sendError(res, 500, 'Erro ao gerar flashcards da folha');
  }
});

// ── GET /leaves/:leafId/flashcards ──
leafRouter.get('/leaves/:leafId/flashcards', async (req, res) => {
  try {
    const { error } = await verifyLeafOwnership(req.params.leafId, req.user.id);
    if (error) return sendError(res, 404, error);

    const flashcards = await db.get('flashcards');
    const filtered = flashcards.filter((c) => c.leafId === req.params.leafId);
    return sendSuccess(res, filtered);
  } catch (err) {
    console.error('Erro ao listar flashcards da folha:', err);
    return sendError(res, 500, 'Erro ao listar flashcards da folha');
  }
});
