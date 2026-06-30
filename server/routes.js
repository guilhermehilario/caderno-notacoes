import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from './database.js';
import { authMiddleware, JWT_SECRET } from './authMiddleware.js';

export const router = express.Router();

// Lê a chave de refresh do ambiente, com fallback para desenvolvimento local
const REFRESH_SECRET = process.env.REFRESH_SECRET;
if (!REFRESH_SECRET) {
  console.error('❌ REFRESH_SECRET não definido. Configure a variável de ambiente REFRESH_SECRET.');
  process.exit(1);
}

const isSecure = process.env.NODE_ENV === 'production';
const SALT_ROUNDS = 12;

// ==========================================
// 1. ROTAS DE AUTENTICAÇÃO
// ==========================================

// Registrar Usuário
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios ausentes', 
        message: 'Campos obrigatórios ausentes' 
      });
    }

    const users = await db.get('users');
    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ 
        error: 'E-mail já cadastrado', 
        message: 'E-mail já cadastrado' 
      });
    }

    // Hash da senha com bcrypt
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = {
      id: crypto.randomUUID(),
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.insert('users', newUser);

    // Gerar tokens
    const accessToken = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '24h' });
    const refreshToken = jwt.sign({ userId: newUser.id }, REFRESH_SECRET, { expiresIn: '7d' });

    // Setar refresh token cookie (secure ativado apenas em produção)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
    });

    const { password: _, ...userWithoutPassword } = newUser;
    return res.status(201).json({
      user: userWithoutPassword,
      accessToken
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    return res.status(500).json({ 
      error: 'Erro interno ao registrar usuário', 
      message: 'Erro interno ao registrar usuário' 
    });
  }
});

// Login do Usuário
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'E-mail e senha são obrigatórios', 
        message: 'E-mail e senha são obrigatórios' 
      });
    }

    const users = await db.get('users');
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    // Usa comparação segura com bcrypt (tempo constante, resistente a timing attack)
    const isPasswordValid = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !isPasswordValid) {
      return res.status(401).json({ 
        error: 'E-mail ou senha incorretos', 
        message: 'E-mail ou senha incorretos' 
      });
    }

    // Gerar tokens
    const accessToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
    const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: '7d' });

    // Setar refresh token cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
    });

    const { password: _, ...userWithoutPassword } = user;
    return res.json({
      user: userWithoutPassword,
      accessToken
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ 
      error: 'Erro interno ao realizar login', 
      message: 'Erro interno ao realizar login' 
    });
  }
});

// Logout do Usuário
router.post('/auth/logout', (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax'
  });
  return res.status(200).json({ message: 'Deslogado com sucesso' });
});

// Renovar Access Token (Refresh)
router.post('/auth/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token ausente' });
  }

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    const users = await db.get('users');
    const user = users.find(u => u.id === decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const accessToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ accessToken });
  } catch (error) {
    return res.status(401).json({ error: 'Refresh token inválido ou expirado' });
  }
});

// Perfil do Usuário
router.get('/auth/profile', authMiddleware, (req, res) => {
  const { password: _, ...userWithoutPassword } = req.user;
  return res.json(userWithoutPassword);
});


// ==========================================
// 2. ROTAS DE CADERNOS (NOTEBOOKS)
// ==========================================

// Listar Cadernos
router.get('/notebooks', authMiddleware, async (req, res) => {
  try {
    const notebooks = await db.get('notebooks');
    const userNotebooks = notebooks.filter(nb => nb.userId === req.user.id);
    const leaves = await db.get('leaves');

    const enrichedNotebooks = userNotebooks.map(nb => {
      const leavesCount = leaves.filter(l => l.notebookId === nb.id).length;
      return { ...nb, leavesCount };
    });

    return res.json(enrichedNotebooks);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar cadernos' });
  }
});

// Detalhes do Caderno
router.get('/notebooks/:id', authMiddleware, async (req, res) => {
  try {
    const notebooks = await db.get('notebooks');
    const notebook = notebooks.find(nb => nb.id === req.params.id && nb.userId === req.user.id);
    
    if (!notebook) {
      return res.status(404).json({ error: 'Caderno não encontrado' });
    }

    const leaves = await db.get('leaves');
    const leavesCount = leaves.filter(l => l.notebookId === notebook.id).length;

    return res.json({ ...notebook, leavesCount });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao obter caderno' });
  }
});

// Criar Caderno
router.post('/notebooks', authMiddleware, async (req, res) => {
  try {
    const { title, description, color } = req.body;

    if (!title || !color) {
      return res.status(400).json({ error: 'Título e cor são obrigatórios' });
    }

    const newNotebook = {
      id: crypto.randomUUID(),
      userId: req.user.id,
      title,
      description: description || null,
      color,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.insert('notebooks', newNotebook);

    return res.status(201).json({ ...newNotebook, leavesCount: 0 });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao criar caderno' });
  }
});

// Editar Caderno
router.put('/notebooks/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, color } = req.body;
    const notebooks = await db.get('notebooks');
    const notebook = notebooks.find(nb => nb.id === req.params.id && nb.userId === req.user.id);

    if (!notebook) {
      return res.status(404).json({ error: 'Caderno não encontrado' });
    }

    const updated = await db.update('notebooks', req.params.id, { title, description, color });
    
    const leaves = await db.get('leaves');
    const leavesCount = leaves.filter(l => l.notebookId === updated.id).length;

    return res.json({ ...updated, leavesCount });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar caderno' });
  }
});

// Deletar Caderno
router.delete('/notebooks/:id', authMiddleware, async (req, res) => {
  try {
    const notebooks = await db.get('notebooks');
    const notebook = notebooks.find(nb => nb.id === req.params.id && nb.userId === req.user.id);

    if (!notebook) {
      return res.status(404).json({ error: 'Caderno não encontrado' });
    }

    await db.delete('notebooks', req.params.id);

    // Cascata: Deletar folhas
    const leaves = await db.get('leaves');
    const remainingLeaves = leaves.filter(l => l.notebookId !== req.params.id);
    await db.save('leaves', remainingLeaves);

    // Cascata: Deletar flashcards
    const flashcards = await db.get('flashcards');
    const remainingFlashcards = flashcards.filter(c => c.notebookId !== req.params.id);
    await db.save('flashcards', remainingFlashcards);

    return res.status(204).end();
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao deletar caderno' });
  }
});


// ==========================================
// 3. ROTAS DE FOLHAS/AULAS (LEAVES)
// ==========================================

// Utilitário: verifica se uma folha pertence a um notebook do usuário autenticado
async function verifyLeafOwnership(leafId, userId) {
  const leaves = await db.get('leaves');
  const leaf = leaves.find(l => l.id === leafId);    if (!leaf) return { leaf: null, error: 'Folha não encontrada' };

  const notebooks = await db.get('notebooks');
  const notebook = notebooks.find(nb => nb.id === leaf.notebookId);
  if (!notebook || notebook.userId !== userId) {
    return { leaf: null, error: 'Acesso negado' };
  }

  return { leaf, error: null };
}

// Listar folhas de um caderno (com owner check)
router.get('/notebooks/:notebookId/leaves', authMiddleware, async (req, res) => {
  try {
    // Verifica se o caderno pertence ao usuário
    const notebooks = await db.get('notebooks');
    const notebook = notebooks.find(nb => nb.id === req.params.notebookId && nb.userId === req.user.id);
    if (!notebook) {
      return res.status(404).json({ error: 'Caderno não encontrado' });
    }

    const leaves = await db.get('leaves');
    const filtered = leaves.filter(l => l.notebookId === req.params.notebookId);
    return res.json(filtered);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar folhas' });
  }
});

// Criar folha (com owner check)
router.post('/notebooks/:notebookId/leaves', authMiddleware, async (req, res) => {
  try {
    // Verifica se o caderno pertence ao usuário
    const notebooks = await db.get('notebooks');
    const notebook = notebooks.find(nb => nb.id === req.params.notebookId && nb.userId === req.user.id);
    if (!notebook) {
      return res.status(404).json({ error: 'Caderno não encontrado' });
    }

    const { title, content, rawText } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Título é obrigatório' });
    }

    const newLeaf = {
      id: crypto.randomUUID(),
      notebookId: req.params.notebookId,
      title,
      content: content || '',
      rawText: rawText || '',
      summary: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.insert('leaves', newLeaf);
    return res.status(201).json(newLeaf);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao criar folha' });
  }
});

// Detalhes da folha (com owner check)
router.get('/leaves/:leafId', authMiddleware, async (req, res) => {
  try {
    const { leaf, error } = await verifyLeafOwnership(req.params.leafId, req.user.id);
    if (error) return res.status(404).json({ error });
    return res.json(leaf);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao obter folha' });
  }
});

// Editar folha (com owner check)
router.put('/leaves/:leafId', authMiddleware, async (req, res) => {
  try {
    const { leaf, error } = await verifyLeafOwnership(req.params.leafId, req.user.id);
    if (error) return res.status(404).json({ error });

    const { title, content, rawText, summary } = req.body;
    const updated = await db.update('leaves', req.params.leafId, { title, content, rawText, summary });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao editar folha' });
  }
});

// Deletar folha (com owner check)
router.delete('/leaves/:leafId', authMiddleware, async (req, res) => {
  try {
    const { leaf, error } = await verifyLeafOwnership(req.params.leafId, req.user.id);
    if (error) return res.status(404).json({ error });

    await db.delete('leaves', req.params.leafId);

    // Cascata: Deletar flashcards
    const flashcards = await db.get('flashcards');
    const remainingFlashcards = flashcards.filter(c => c.leafId !== req.params.leafId);
    await db.save('flashcards', remainingFlashcards);

    return res.status(204).end();
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao deletar folha' });
  }
});

// Geração de Resumo com IA (Mockado) — com owner check
router.post('/leaves/:leafId/summary', authMiddleware, async (req, res) => {
  try {
    const { leaf, error } = await verifyLeafOwnership(req.params.leafId, req.user.id);
    if (error) return res.status(404).json({ error });

    const cleanTitle = leaf.title;
    const cleanText = leaf.rawText || 'Sem conteúdo adicional.';

    const summaryText = `### Resumo da Aula: ${cleanTitle}\n\nEste resumo foi gerado dinamicamente pela inteligência artificial com base nas notas fornecidas.\n\n- **Conceito Principal**: Foco em ${cleanTitle}.\n- **Ideias Chave**:\n  1. A importância de reter os conceitos práticos e relacioná-los a exemplos do cotidiano.\n  2. Uso de revisões sistemáticas para evitar a curva do esquecimento de Ebbinghaus.\n- **Conteúdo Analisado**: \n  > "${cleanText.substring(0, 150)}${cleanText.length > 150 ? '...' : ''}"\n\n*Utilize os flashcards associados para testar sua memória ativa!*`;

    const updated = await db.update('leaves', req.params.leafId, { summary: summaryText });
    return res.json({ summary: updated.summary });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao gerar resumo da folha' });
  }
});

// Geração de Flashcards com IA (Mockado) — com owner check
router.post('/leaves/:leafId/flashcards', authMiddleware, async (req, res) => {
  try {
    const { leaf, error } = await verifyLeafOwnership(req.params.leafId, req.user.id);
    if (error) return res.status(404).json({ error });

    // Gerar 3 cards mockados baseados no título
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
        updatedAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        leafId: leaf.id,
        notebookId: leaf.notebookId,
        front: `De acordo com as notas de "${leaf.title}", qual é uma boa prática de estudo para este tema?`,
        back: `Escrever resumos com as próprias palavras e fazer exercícios práticos/simulados logo em seguida.`,
        repetitions: 0,
        interval: 0,
        easeFactor: 2.5,
        nextReviewDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        leafId: leaf.id,
        notebookId: leaf.notebookId,
        front: `Qual a importância da repetição espaçada no aprendizado de "${leaf.title}"?`,
        back: `Ela ajuda a combater a curva do esquecimento, movendo a informação da memória de curto prazo para a de longo prazo.`,
        repetitions: 0,
        interval: 0,
        easeFactor: 2.5,
        nextReviewDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    for (const card of mockCards) {
      await db.insert('flashcards', card);
    }

    return res.status(201).json(mockCards);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao gerar flashcards da folha' });
  }
});


// ==========================================
// 4. ROTAS DE FLASHCARDS & ESTUDO (SM-2)
// ==========================================

// Obter flashcards de uma folha (com owner check via verifyLeafOwnership)
router.get('/leaves/:leafId/flashcards', authMiddleware, async (req, res) => {
  try {
    const { error } = await verifyLeafOwnership(req.params.leafId, req.user.id);
    if (error) return res.status(404).json({ error });

    const flashcards = await db.get('flashcards');
    const filtered = flashcards.filter(c => c.leafId === req.params.leafId);
    return res.json(filtered);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar flashcards da folha' });
  }
});

// Obter flashcards de um caderno inteiro (com owner check)
router.get('/notebooks/:notebookId/flashcards', authMiddleware, async (req, res) => {
  try {
    const notebooks = await db.get('notebooks');
    const notebook = notebooks.find(nb => nb.id === req.params.notebookId && nb.userId === req.user.id);
    if (!notebook) {
      return res.status(404).json({ error: 'Caderno não encontrado' });
    }

    const flashcards = await db.get('flashcards');
    const filtered = flashcards.filter(c => c.notebookId === req.params.notebookId);
    return res.json(filtered);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar flashcards do caderno' });
  }
});

// Submeter score do flashcard (Algoritmo SM-2) — com owner check
router.post('/flashcards/:cardId/review', authMiddleware, async (req, res) => {
  try {
    const { score } = req.body;

    if (score === undefined || score < 0 || score > 5) {
      return res.status(400).json({ error: 'Score inválido. Deve ser entre 0 e 5' });
    }

    const flashcards = await db.get('flashcards');
    const card = flashcards.find(c => c.id === req.params.cardId);
    if (!card) {
      return res.status(404).json({ error: 'Flashcard não encontrado' });
    }

    // Verifica se o flashcard pertence a um notebook do usuário
    const notebooks = await db.get('notebooks');
    const notebook = notebooks.find(nb => nb.id === card.notebookId && nb.userId === req.user.id);
    if (!notebook) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    let { repetitions, interval, easeFactor } = card;

    // Lógica do algoritmo SuperMemo-2 (SM-2)
    if (score >= 3) {
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions++;
    } else {
      repetitions = 0;
      interval = 1;
    }

    // Calcular novo fator de facilidade (Ease Factor)
    easeFactor = easeFactor + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02));
    if (easeFactor < 1.3) {
      easeFactor = 1.3;
    }

    // Calcular data da próxima revisão
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    const updatedCard = await db.update('flashcards', req.params.cardId, {
      repetitions,
      interval,
      easeFactor,
      nextReviewDate: nextReviewDate.toISOString()
    });

    return res.json(updatedCard);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao processar revisão do flashcard' });
  }
});
