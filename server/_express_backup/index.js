import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// 📦 Módulos de rota separados por domínio
import { authRouter } from './routes/auth.js';
import { notebookRouter } from './routes/notebooks.js';
import { leafRouter } from './routes/leaves.js';
import { flashcardRouter } from './routes/flashcards.js';
import { studyRouter } from './routes/study.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ═══════════════════════════════════════════════════════════════
//  Middleware Globais
// ═══════════════════════════════════════════════════════════════

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' })); // Limite de payload
app.use(cookieParser());

// Logger estruturado
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`,
    );
  });
  next();
});

// ═══════════════════════════════════════════════════════════════
//  Rotas de Sistema (públicas, ANTES dos routers auth-protegidos)
// ═══════════════════════════════════════════════════════════════

app.get('/', (_req, res) => {
  res.json({ message: 'API Revisa Aula está ativa!', status: 'OK' });
});

// Health check - NÃO requer autenticação
app.get('/api/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ═══════════════════════════════════════════════════════════════
//  Rotas da API (protegidas por authMiddleware nos routers)
// ═══════════════════════════════════════════════════════════════

app.use('/api/auth', authRouter);
app.use('/api/notebooks', notebookRouter);

app.use('/api', leafRouter);
app.use('/api', flashcardRouter);
app.use('/api', studyRouter);

// ═══════════════════════════════════════════════════════════════
//  Tratamento de Erros (deve ser o ÚLTIMO middleware)
// ═══════════════════════════════════════════════════════════════

app.use((err, _req, res, _next) => {
  console.error('[ERRO NÃO TRATADO]', err.stack || err.message || err);

  // Erros conhecidos do Express
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido no corpo da requisição' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload muito grande' });
  }

  res.status(500).json({ error: 'Ocorreu um erro interno no servidor' });
});

// ═══════════════════════════════════════════════════════════════
//  Inicialização
// ═══════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log('=============================================');
  console.log(`  🚀 Servidor rodando em: http://localhost:${PORT}`);
  console.log(`  📡 Base da API: http://localhost:${PORT}/api`);
  console.log('=============================================');
});
