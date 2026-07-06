# AGENTS.md

## Contexto do projeto

Este repositório é o frontend/backend de um app de estudos chamado **Revisa Aula**.

### Stack Atual

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | React 19 + Vite 8 + TypeScript |
| **Backend** | NestJS 11 + TypeScript |
| **Banco** | SQLite via Prisma ORM 7 (driver adapter LibSQL) |
| **Estado servidor** | TanStack React Query v5 |
| **Estado local/UI** | Zustand 5 (com persistência) |
| **Editor de folhas** | TipTap |
| **Autenticação** | JWT + Passport + refresh token em cookie HttpOnly |
| **Validação** | class-validator + class-transformer (backend), Zod (frontend) |
| **Config** | @nestjs/config (backend) |

### Estrutura do Backend (NestJS)

```
server/
├── src/
│   ├── main.ts                         → Bootstrap NestJS
│   ├── app.module.ts                   → Root module (ValidationPipe, ExceptionFilter)
│   ├── app.controller.ts               → Health check + status
│   ├── prisma/
│   │   ├── prisma.service.ts           → PrismaClient + LibSQL adapter (SQLite)
│   │   └── prisma.module.ts            → @Global() module
│   ├── common/
│   │   ├── guards/jwt-auth.guard.ts    → Passport JWT Guard
│   │   ├── decorators/current-user.decorator.ts → @CurrentUser()
│   │   └── filters/http-exception.filter.ts     → AllExceptionsFilter
│   ├── auth/
│   │   ├── auth.module.ts              → JWT via ConfigService
│   │   ├── auth.controller.ts          → register, login, logout, refresh, profile
│   │   ├── auth.service.ts             → Lógica de autenticação
│   │   ├── jwt.strategy.ts             → Passport JWT Strategy
│   │   └── dto/                        → RegisterDto, LoginDto
│   ├── notebooks/
│   │   ├── notebooks.module.ts
│   │   ├── notebooks.controller.ts     → CRUD /notebooks
│   │   ├── notebooks.service.ts        → CRUD + cascade delete via Prisma
│   │   └── dto/                        → CreateNotebookDto, UpdateNotebookDto
│   ├── leaves/
│   │   ├── leaves.module.ts
│   │   ├── leaves.controller.ts        → CRUD /notebooks/:nbId/leaves + /leaves/:id
│   │   ├── leaves.service.ts           → CRUD + IA mock (summary, flashcards)
│   │   └── dto/                        → CreateLeafDto, UpdateLeafDto
│   ├── flashcards/
│   │   ├── flashcards.module.ts
│   │   ├── flashcards.controller.ts    → GET/PUT flashcards + POST review
│   │   ├── flashcards.service.ts       → SM-2 com CAP 365 dias
│   │   └── dto/                        → ReviewFlashcardDto, UpdateFlashcardDto
│   └── study/
│       ├── study.module.ts
│       ├── study.controller.ts         → Sessões + stats
│       ├── study.service.ts            → Persistência sessão + getStats
│       └── dto/                        → SaveSessionDto
├── prisma/
│   ├── schema.prisma                   → Modelos: User, Notebook, Leaf, Flashcard, StudySession
│   ├── seed.ts                         → Script de migração db.json → SQLite
│   └── migrations/                     → Migration inicial
├── prisma.config.ts                    → Config Prisma v7
├── dev.db                              → Banco SQLite
└── .env                                → PORT, JWT_SECRET, DATABASE_URL, etc.
```

## Objetivo principal do app

O usuário cria cadernos, folhas de anotação, gera resumos e flashcards por IA e revisa os cards em uma sessão de estudo com repetição espaçada (SM-2).

## Status atual do desenvolvimento

- ✅ Autenticação (register, login, logout, refresh, profile)
- ✅ CRUD de notebooks
- ✅ CRUD de leaves + auto-save no editor TipTap
- ✅ Geração de resumo e flashcards por IA (mockada)
- ✅ Algoritmo SM-2 com CAP de 365 dias
- ✅ Sessão de estudo persistente (backend via API)
- ✅ Estatísticas de progresso (StudyProgressSummary)
- ✅ Refatoração completa para NestJS 11 + Prisma ORM 7 + SQLite
- ✅ Limpeza de arquivos legados do Express

## ⚡ Últimas alterações (Julho 2026)

### Migração Express → NestJS + Prisma + SQLite

**O que foi feito:** Substituição completa do backend Express (JavaScript, db.json) por NestJS (TypeScript, Prisma ORM, SQLite).

#### Mudanças na arquitetura

| Aspecto | Antes (Express) | Depois (NestJS) |
|---------|-----------------|-----------------|
| **Linguagem** | JavaScript (`.js`) | TypeScript (`.ts`) |
| **Framework** | Express | NestJS 11 |
| **Banco** | `db.json` (arquivo JSON) | SQLite via Prisma ORM 7 |
| **Validação** | `validateBody()` manual | `class-validator` decorators |
| **Auth** | `authMiddleware.js` manual | Passport JWT Strategy |
| **DI** | Import direto de módulos | Injeção de dependência |
| **Erros** | try/catch manual | ExceptionFilter global |
| **Config** | `process.env` direto | ConfigModule + ConfigService |
| **ORM** | N/A | Prisma 7 (driver adapter LibSQL) |

#### Correções aplicadas (nesta sessão)

1. **`server/src/main.ts`** — cookie-parser corrigido: `import * as cookieParser` → `import cookieParser from 'cookie-parser'`, removendo ternary frágil
2. **`server/prisma.config.ts`** — `dotenv` adicionado como dependência direta para comandos Prisma CLI
3. **Porta 3000** — Processo antigo do Express finalizado (PID 53201 e 59635)
4. **Arquivos legados** — `server/index.js`, `database.js`, `authMiddleware.js`, `routes/`, `middleware/` movidos para `server/_express_backup/`
5. **`package.json`** — `express` instalado como dependência (peer do `@nestjs/platform-express`)

#### Arquivos alterados/criados

| Arquivo | Ação |
|---------|------|
| `server/prisma/schema.prisma` | **Criado** — 5 modelos com relações e cascade delete |
| `server/prisma/seed.ts` | **Criado** — Migração db.json → SQLite |
| `server/prisma.config.ts` | **Criado** — Config Prisma v7 |
| `server/src/prisma/prisma.service.ts` | **Criado** — PrismaClient + LibSQL adapter |
| `server/src/prisma/prisma.module.ts` | **Criado** — Módulo @Global |
| `server/src/auth/*` | **Reescritos** — NestJS com Passport JWT |
| `server/src/notebooks/*` | **Reescrito** — CRUD com Prisma |
| `server/src/leaves/*` | **Reescrito** — CRUD + IA mock |
| `server/src/flashcards/*` | **Reescrito** — SM-2 com CAP |
| `server/src/study/*` | **Reescrito** — Sessões + stats |
| `server/src/common/*` | **Criado** — Guards, decorators, filters |
| `server/src/main.ts` | **Criado** — Bootstrap NestJS |
| `server/src/app.module.ts` | **Criado** — Root module |
| `server/src/app.controller.ts` | **Criado** — Health check |
| `server/tsconfig.json` | **Criado** — Config TypeScript |
| `server/nest-cli.json` | **Criado** — Config NestJS CLI |
| `server/.env` | **Atualizado** — JWT_SECRET, DATABASE_URL, etc. |
| `server/package.json` | **Atualizado** — Dependências NestJS + Prisma |
| `server/_express_backup/` | **Criado** — Backup dos arquivos Express antigos |

## Rotas da API

### Auth (`/api/auth`)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/register` | Registrar novo usuário |
| POST | `/auth/login` | Login |
| POST | `/auth/logout` | Logout (limpa cookie) |
| POST | `/auth/refresh` | Renovar access token |
| GET | `/auth/profile` | Perfil do usuário (auth) |

### Notebooks (`/api/notebooks`, auth required)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/notebooks` | Listar cadernos |
| GET | `/notebooks/:id` | Detalhes do caderno |
| POST | `/notebooks` | Criar caderno |
| PUT | `/notebooks/:id` | Atualizar caderno |
| DELETE | `/notebooks/:id` | Excluir caderno (cascade) |

### Leaves (auth required)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/notebooks/:id/leaves` | Listar folhas |
| POST | `/notebooks/:id/leaves` | Criar folha |
| GET | `/leaves/:id` | Detalhes da folha |
| PUT | `/leaves/:id` | Atualizar folha |
| DELETE | `/leaves/:id` | Excluir folha |
| POST | `/leaves/:id/summary` | Gerar resumo (IA mock) |
| POST | `/leaves/:id/flashcards` | Gerar flashcards (IA mock) |
| GET | `/leaves/:id/flashcards` | Listar flashcards da folha |

### Flashcards (auth required)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/notebooks/:id/flashcards` | Listar flashcards do caderno |
| PUT | `/flashcards/:id` | Atualizar front/back |
| POST | `/flashcards/:id/review` | Revisar (score 0-5, SM-2) |

### Study (auth required)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/study-sessions/:notebookId` | Carregar sessão |
| PUT | `/study-sessions/:notebookId` | Salvar sessão |
| DELETE | `/study-sessions/:notebookId` | Remover sessão |
| GET | `/study/stats` | Estatísticas de progresso |

## Regras importantes para futuras alterações

- Não reintroduzir refetches agressivos em rotas de edição sem necessidade
- Evitar invalidar queries inteiras quando o objetivo for apenas atualizar um item específico
- Preservar o estado local do editor sempre que possível (usar refs de controle como `initialSyncDoneRef`)
- Manter as atualizações de cache idempotentes: se o valor já estiver correto, não sobrescrever
- Para estado de sessão de estudo, SEMPRE usar a Zustand Store (`studyStore`) em vez de `useState` local
- Limpar timeouts e timers em `useEffect` de cleanup para evitar memory leaks
- Ao adicionar novos módulos NestJS, importar `AuthModule` para disponibilizar o `JwtAuthGuard`
- Dependências Prisma: o `prisma.config.ts` é necessário para comandos CLI do Prisma v7

## Para rodar o projeto

```bash
# Backend (NestJS)
cd server
npm install
npm run dev           # http://localhost:3000

# Frontend (Vite)
npm install
npm run dev           # http://localhost:5173
```
