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
| **Drag & Drop** | @dnd-kit (core + sortable + utilities) |
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
│   │   └── dto/                        → CreateLeafDto, UpdateLeafDto, ReorderLeavesDto
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
│   ├── schema.prisma                   → Modelos: User, Notebook, Leaf, Flashcard, StudySession, etc.
│   ├── seed.ts                         → Script de migração db.json → SQLite
│   └── migrations/                     → Migrações (init, tags, trash, position, etc.)
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
- ✅ Seção de sub-folhas colapsável no editor
- ✅ Reordenação de sub-folhas por drag & drop (com @dnd-kit)
- ✅ Scripts start.sh e stop.sh para gerenciar backend + frontend

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

#### Correções aplicadas (sessão anterior)

1. **`server/src/main.ts`** — cookie-parser corrigido: `import * as cookieParser` → `import cookieParser from 'cookie-parser'`, removendo ternary frágil
2. **`server/prisma.config.ts`** — `dotenv` adicionado como dependência direta para comandos Prisma CLI
3. **Porta 3000** — Processo antigo do Express finalizado
4. **Arquivos legados** — `server/index.js`, `database.js`, `authMiddleware.js`, `routes/`, `middleware/` movidos para `server/_express_backup/`
5. **`package.json`** — `express` instalado como dependência (peer do `@nestjs/platform-express`)

### Sessão atual (Julho 2026) — Correção scripts + Drag & Drop + Ajustes Editor

**O que foi feito:** Correção do script de inicialização, implementação de drag & drop para reordenação de sub-folhas, e ajustes de layout do editor.

#### Mudanças realizadas

| Área | Mudança | Detalhes |
|------|---------|----------|
| `start.sh` | **Correção de PID** | `\$\$` estava entre aspas simples dentro do `bash -c`, resultando em PID literal `$$` no arquivo. Corrigido para escrever o PID real do processo. |
| `start.sh` | **Health check aprimorado** | URL específica por serviço: `/api/health` para backend, `/` para frontend. Timeout aumentado para 30s com `--max-time 2` no curl. |
| `start.sh` | **Validação de PID** | `[ "$pid" -eq "$pid" ] 2>/dev/null` para garantir que o PID é numérico antes de testar com `kill -0`. |
| `start.sh` | **Frontend** | Instala `node_modules` na raiz automaticamente ao iniciar o frontend. |
| `server/prisma/schema.prisma` | **Campo `position`** | Adicionado `position Int @default(0)` ao modelo `Leaf` para ordenação manual. |
| `server/src/leaves/` | **Endpoint reorder** | `PATCH /leaves/reorder` com DTO `ReorderLeavesDto`. Atualiza posições em transação. Todas as queries de leaf ordenam por `position asc, createdAt desc`. |
| `server/src/leaves/leaves.service.ts` | **Auto-position** | `create()` calcula `nextPosition` via `aggregate._max.position` entre os irmãos. |
| `src/modules/leaves/services/leafService.ts` | **reorderLeaves** | Novo método que chama `PATCH /leaves/reorder` com array de IDs ordenados. |
| `src/modules/leaves/views/EditorView.tsx` | **Seção colapsável** | Sub-folhas agora iniciam recolhidas, com toggle e contagem (`Sub-folhas (N)`). `max-h` reduzido de 60vh para 30vh. |
| `src/modules/leaves/views/EditorView.tsx` | **Drag & Drop** | Instalado `@dnd-kit`. Novo componente `SortableSubLeafCard` com drag handle (`GripVertical`). `DndContext` + `SortableContext` com `horizontalListSortingStrategy`. Update otimista nos caches + rollback via `onSettled`. |
| `src/modules/leaves/views/EditorView.tsx` | **Altura do editor** | `h-[calc(100vh-8rem)]` → `h-full min-h-0`. Remove dupla contagem do padding do `<main>`, dando mais espaço vertical. |
| `src/modules/leaves/views/EditorView.tsx` | **Bug de sub-folhas** | `subLeaves` agora usa `leaf?.children` (do `useLeaf`) em vez de filtrar `leaves` (que só contém folhas raiz). |
| `package.json` | **Dependências** | Adicionado `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`. |

#### Fluxo de reordenação (drag & drop)

1. Usuário expande seção de sub-folhas no editor
2. Arrasta o card pelo ícone `GripVertical` (6 pontos) para a posição desejada
3. O cache do React Query é atualizado imediatamente (feedback visual instantâneo)
4. `reorderMutation.mutate()` persiste a nova ordem no backend
5. Em caso de erro, `onSettled` invalida os caches para restaurar o estado real

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
| PATCH | `/leaves/reorder` | Reordenar sub-folhas (recebe `orderedIds: string[]`) |
| POST | `/leaves/:leafId/archive` | Arquivar folha |
| POST | `/leaves/:leafId/unarchive` | Desarquivar folha |
| GET | `/leaves/archived` | Listar folhas arquivadas |

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
- Sub-folhas: `subLeaves` no `EditorView` deve vir de `leaf?.children` (do `useLeaf`), NÃO de `leaves.filter` (que só contém folhas raiz)
- Para reordenação via drag & drop: usar `@dnd-kit` com update otimista nos caches + `onSettled` para rollback
- Update otimista em drag & drop: invalidar ambos os caches (`["notebooks", notebookId, "leaves"]` e `["leaves", leafId]`) em `onSettled`
- Altura do EditorView: usar `h-full min-h-0` em vez de `h-[calc(100vh-8rem)]` para respeitar o layout flex do `<main>`

## Para rodar o projeto

```bash
# Usando os scripts (recomendado)
./start.sh            # Inicia backend + frontend
./start.sh --status   # Ver status dos serviços
./stop.sh             # Para ambos

# Ou manualmente:
# Backend (NestJS)
cd server
npm install
npm run dev           # http://localhost:3000

# Frontend (Vite)
npm install
npm run dev           # http://localhost:5173
```

### Portas
| Serviço | Porta |
|---------|-------|
| Backend (NestJS) | 3000 |
| Frontend (Vite) | 5173 |
| Health check | http://localhost:3000/api/health |

### Logs
- Backend: `server/logs/server.log`
- Frontend: `logs/frontend.log`
- PIDs: `.pids/backend.pid`, `.pids/frontend.pid`
