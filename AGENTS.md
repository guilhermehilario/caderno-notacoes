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

## Histórico de alterações

### Sessão 08/07/2026 — Correção de overflow horizontal e scroll lateral no EditorView e TagsManagementView

**O que foi feito:** Correção completa de overflow horizontal em dois componentes principais, eliminação de scroll lateral indevido, e aumento da área de edição.

#### Contexto do problema

O app apresentava dois problemas de overflow:
1. **TagsManagementView**: nomes de tag longos estouravam o card horizontalmente
2. **EditorView**: scroll lateral aparecia mesmo com o editor vazio, e o texto podia vazar para fora do container

A causa raiz do scroll lateral no EditorView era o comportamento do CSS onde `overflow-x: hidden` com `overflow-y: visible` (padrão) faz o navegador converter `overflow-y` para `auto`, criando uma scrollbar vertical.

#### Mudanças realizadas

| Área | Mudança | Detalhes |
|------|---------|----------|
| `src/modules/tags/views/TagsManagementView.tsx` | **Overflow de texto em tags** | Adicionado `min-w-0` + `truncate` + `min-w-0` no `<span>` + `flex-shrink-0` nos botões. Impede que nomes longos de tag estourem o card. |
| `src/modules/leaves/views/EditorView.tsx` | **Aumento do container split pane** | `min-h-[500px]` → `min-h-[750px] lg:min-h-[90vh]`. Área do editor + IA aumentada em 50% no mínimo. |
| `src/modules/leaves/views/EditorView.tsx` | **Overflow do split pane** | Adicionado `overflow-hidden` no split pane para cortar qualquer conteúdo que ultrapasse os limites. |
| `src/modules/leaves/views/EditorView.tsx` | **Overflow do editor pane** | `overflow-x-hidden` → `overflow-hidden`. Corrige o CSS gotcha: `overflow-x: hidden` com `overflow-y: visible` faz o navegador converter `overflow-y` para `auto`, criando scrollbar. |
| `src/modules/leaves/views/EditorView.tsx` | **Scroll do tiptap-editor** | `overflow-y-auto` → `overflow-y-hidden`. Remove scroll vertical do editor. Adicionado `pb-1.5` para margem inferior de ~6px. |
| `src/components/layout/AppLayout.tsx` | **Scroll global** | `<main>`: `overflow-y-auto` → `overflow-y-auto overflow-x-hidden`. Impede scroll lateral no conteúdo principal do app. |

#### Lições aprendidas (CSS Gotcha)

**Problema:** `overflow-x: hidden` com `overflow-y: visible` (padrão) → navegador converte `overflow-y` para `auto`, criando scrollbar vertical inesperada.
**Solução:** Sempre usar `overflow-hidden` (ambos os eixos) quando quiser cortar overflow em apenas um eixo, a menos que haja motivo explícito para manter o outro eixo em `visible`.
**Regra:** No projeto, prefira `overflow-hidden` a `overflow-x-hidden` isoladamente, para evitar scrollbars fantasmas.

### Sessão 07/07/2026 — Melhorias de layout, confiabilidade e documentação

**O que foi feito:** Correção da altura do editor, melhoria da confiabilidade do backend, aprimoramento do resumo de estudos, revisão geral de layout e atualização de documentação.

#### Mudanças realizadas

| Área | Mudança | Detalhes |
|------|---------|----------|
| `src/components/layout/AppLayout.tsx` | **Altura do `<main>`** | `flex-grow` → `flex-1 min-h-0` para estabelecer altura explícita no flex container, permitindo que `h-full` nos filhos funcione corretamente. |
| `src/modules/leaves/views/EditorView.tsx` | **Altura do editor** | `flex-grow` → `flex-1` no split pane e editor pane. Adicionado `[&_.ProseMirror]:h-full` e `min-h-[300px]` para o editor ocupar todo o espaço vertical disponível. |
| `server/src/study/study.service.ts` | **Confiabilidade dos stats** | Cálculo de `reviewedToday` mais robusto (verifica `repetitions > 0 || interval > 0 || easeFactor != 2.5`). Adicionado `$transaction` no saveSession. Validação de tipos nos parâmetros. JSON parsing seguro com `safeJsonParse`. |
| `src/modules/study/hooks/useStudyStats.ts` | **Hook exposto** | Agora expõe `refetch` e `isFetching` para refresh manual. |
| `src/modules/study/components/StudyProgressSummary.tsx` | **Refresh manual** | Adicionado botão "Atualizar" com spinner e indicador de fetch. Melhor alinhamento dos componentes. |
| `src/modules/notebooks/views/NotebookView.tsx` | **Layout** | Adicionado `flex-wrap` e `justify-end` no grupo de ações do cabeçalho para melhor responsividade. |
| `AGENTS.md` | **Documentação** | Removido histórico obsoleto da migração Express e sessões anteriores. Mantido apenas o histórico atual e regras relevantes. |
| `README.md` | **Documentação** | Simplificado para refletir o estado atual (NestJS + Prisma + SQLite). Removidas referências ao Express/db.json. |
| `ANALISE_PROBLEMAS.md` | **Débitos técnicos** | Criada nova versão com problemas atuais após a migração para NestJS + Prisma.

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
- **CSS Overflow Gotcha:** `overflow-x: hidden` com `overflow-y: visible` (padrão) faz o navegador converter `overflow-y` para `auto`, criando scrollbar vertical inesperada. Prefira `overflow-hidden` (ambos os eixos) quando quiser cortar overflow.
- Para garantir que texto não vaze horizontalmente em layouts flex: sempre aplicar `min-w-0` + `truncate` no elemento de texto, e `overflow-hidden` no container pai mais próximo.
- TagsManagementView requer `min-w-0` no `<span>` do nome da tag (não apenas no container pai) para que `truncate` funcione corretamente.

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
