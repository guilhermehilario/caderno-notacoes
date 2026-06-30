import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { router } from './routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do CORS
// Permite que o frontend faça requisições e envie cookies de qualquer origem local ou externa
app.use(cors({
  origin: true, // Reflete dinamicamente a origem da requisição
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middlewares
app.use(express.json());
app.use(cookieParser());

// Logger simples
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Rotas da API montadas sob /api
app.use('/api', router);

// Rota padrão de status
app.get('/', (req, res) => {
  res.json({ message: 'API Revisa Aula está ativa!', status: 'OK' });
});

// Tratamento de erros genéricos
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Ocorreu um erro interno no servidor' });
});

// Inicialização
app.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(` Servidor rodando em: http://localhost:${PORT}`);
  console.log(` Base da API: http://localhost:${PORT}/api`);
  console.log(`=============================================`);
});
