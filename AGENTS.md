# AGENTS.md

## Contexto do projeto

Este repositório é o frontend/backend de um app de estudos chamado Revisa Aula / StudyNotes Flash.

- Frontend: React 19 + Vite 8 + TypeScript
- Backend: Node.js + Express
- Estado de servidor: React Query
- Estado local/UI: Zustand
- Editor de folhas: TipTap
- Autenticação: JWT + refresh token em cookie HttpOnly

## Objetivo principal do app

O usuário cria cadernos, folhas de anotação, gera resumos e flashcards por IA e revisa os cards em uma sessão de estudo.

## Status atual do desenvolvimento

O fluxo principal já está implementado e funcional:

- autenticação
- CRUD de notebooks
- CRUD de leaves
- auto-save no editor
- geração de resumo e flashcards por IA (mockada no backend)
- fluxo de estudo com flashcards

## ⚡ Últimas alterações (Julho 2026)

### Problema resolvido: Loop de renderização e screen recreation no salvamento

**Causa raiz:** O efeito de sincronização servidor→editor em `EditorView.tsx` dependia de `[leaf?.id, leaf?.content]` e executava `editor.commands.setContent()` a cada re-render. Isso disparava `onUpdate` → `handleEditorUpdate`, que podia re-escrever o estado local e forçar um novo save, criando um ciclo. Além disso, a troca de `saveStatus` entre "saving" e "saved" causava re-render que re-executava o sync effect, sobrescrevendo o conteúdo do editor com dados antigos do servidor.

**Correção aplicada:**

1. **`EditorView.tsx`** — Substituído o sync effect por uma sincronização única controlada por `initialSyncDoneRef`. Agora o conteúdo do servidor só é carregado no editor UMA VEZ (no primeiro mount). Depois disso, o editor é a fonte da verdade local e nenhum re-render subsequente sobrescreve o conteúdo. O auto-save continua funcionando mas sem causar loop. Adicionada animação de dots pulsantes no indicador de "Salvando..." no canto superior direito.

2. **`studyStore.ts`** — Adicionados `sessionActive`, `flashcards`, `completedCardIds`, `scores` ao estado da sessão. Os flashcards agora são armazenados na Zustand Store (não em `useState` local), garantindo que sobrevivam a remounts do StudyView sem perder o progresso do usuário (currentIndex, reviewedCount, showAnswer).

3. **`StudyView.tsx`** — Migrado de `useState(frozenFlashcards)` para `useStudyStore().sessions[nbId].flashcards`. Adicionado indicador de salvamento discreto (animação de dots) ao submeter scores. Adicionado `useCallback` no `handleScoreSelect` com cleanup de timeout. Adicionados `saveStatusTimerRef` para evitar memory leaks.

4. **`server/routes.js`** — Adicionado endpoint `PUT /flashcards/:cardId` para atualizar front/back de flashcards com verificação de ownership via cadeia de notebooks.

5. **`src/modules/study/services/studyService.ts`** — Adicionado método `updateFlashcard(cardId, { front?, back? })` para consumir o novo endpoint.

### ⚡ Segunda rodada: Persistência de sessão de estudo no backend (Julho 2026)

**Problema:** O progresso da sessão de estudo (currentIndex, reviewedCount, flashcards congelados, scores) era armazenado apenas na memória (Zustand store). Ao recarregar a página ou fechar o navegador, todo o progresso era perdido e o usuário precisava recomeçar.

**Solução:** Adicionada persistência opaca via API REST, sincronizando automaticamente o estado da sessão com o backend.

**Detalhes:**

1. **`server/routes.js`** — 3 novos endpoints:
   - `PUT /study-sessions/:notebookId` — Salva/atualiza sessão (com ownership check)
   - `GET /study-sessions/:notebookId` — Carrega sessão salva (retorna 404 se não existe)
   - `DELETE /study-sessions/:notebookId` — Remove sessão ao finalizar/resetar

2. **`server/db.json`** — Adicionada coleção `studySessions`

3. **`src/modules/study/services/studySessionService.ts`** — Serviço frontend com `saveSession`, `loadSession` (com tratamento de 404 → null), `deleteSession`

4. **`src/modules/study/studyStore.ts`** — Nova ação `loadSession(notebookId, data)` que restaura todo o estado da sessão a partir de dados do backend

5. **`src/modules/study/hooks/useStudySessionPersistence.ts`** — Hook que:
   - Restaura sessão automaticamente ao montar o componente (apenas se não houver sessão ativa na store)
   - Persiste automaticamente com debounce de 2s quando o progresso muda
   - Expõe `clearPersistedSession()` para limpeza ao resetar
   - Usa `startTransition` e `isRestoringRef` para evitar race conditions

6. **`src/modules/study/views/StudyView.tsx`** — Hook integrado; `clearPersistedSession()` chamado ao clicar "Estudar Novamente"

### Arquivos alterados (rodada 1):

| Arquivo | Alteração |
|---------|-----------|
| `src/modules/leaves/views/EditorView.tsx` | Sincronização única, animação de dots no saveStatus |
| `src/modules/study/studyStore.ts` | Flashcards e scores persistidos na store |
| `src/modules/study/views/StudyView.tsx` | Store persistente, saveStatus, useCallback, timeout cleanup |
| `src/modules/study/services/studyService.ts` | Novo método updateFlashcard |
| `server/routes.js` | Novo endpoint PUT /flashcards/:cardId |

### Arquivos alterados (rodada 2):

| Arquivo | Alteração |
|---------|-----------|
| `server/db.json` | Coleção `studySessions` adicionada |
| `server/routes.js` | 3 endpoints de sessão de estudo (GET/PUT/DELETE) |
| `src/modules/study/services/studySessionService.ts` | **Novo** serviço de persistência de sessão |
| `src/modules/study/studyStore.ts` | Ação `loadSession` adicionada |
| `src/modules/study/hooks/useStudySessionPersistence.ts` | **Novo** hook auto-save + auto-restore |
| `src/modules/study/views/StudyView.tsx` | Hook integrado, limpeza ao resetar |
| `AGENTS.md` | Documentação atualizada |

### ⚡ Terceira rodada: Resumo visual de progresso no Dashboard (Julho 2026)

**Problema:** Não havia visibilidade do progresso geral dos estudos — quantos cards foram revisados hoje, quantos estão pendentes e a taxa de acerto.

**Solução:** Adicionado componente `StudyProgressSummary` no topo do Dashboard com cards visuais e gráficos.

**Detalhes:**

1. **`server/routes.js`** — Novo endpoint `GET /study/stats`:
   - Retorna `totalCards`, `reviewedToday`, `dueForReview`, `accuracyRate`, `avgEaseFactor`
   - Inclui breakdown `perNotebook` com progresso individual
   - Corrigido para contar cards com score < 3 como "revisados hoje" (quando repetitions=0 mas updatedAt é de hoje e createdAt não é de hoje)
   - Verifica ownership dos flashcards via cadeia de notebooks do usuário

2. **`src/modules/study/services/studyService.ts`** — Método `getStats()` e type `StudyStats` adicionados dentro do objeto `studyService`

3. **`src/modules/study/hooks/useStudyStats.ts`** — Hook React Query com staleTime de 2 minutos

4. **`src/modules/study/components/StudyProgressSummary.tsx`** — Componente visual:
   - 4 cards de estatística (Total de Cards, Revisados Hoje, A Revisar, Taxa de Acerto com anel SVG)
   - Breakdown por caderno com barras de progresso
   - Estado de loading (spinner) e empty state
   - Cores dinâmicas na taxa de acerto (verde ≥70%, âmbar ≥40%, vermelho <40%)

5. **`src/modules/notebooks/views/DashboardView.tsx`** — Componente integrado acima da welcome bar

### Arquivos alterados (rodada 3):

| Arquivo | Alteração |
|---------|-----------|
| `server/routes.js` | Endpoint GET /study/stats |
| `src/modules/study/services/studyService.ts` | Método getStats + type StudyStats |
| `src/modules/study/hooks/useStudyStats.ts` | **Novo** hook de estatísticas |
| `src/modules/study/components/StudyProgressSummary.tsx` | **Novo** componente de progresso |
| `src/modules/notebooks/views/DashboardView.tsx` | Componente integrado |
| `AGENTS.md` | Documentação atualizada |

## Arquivos relevantes para o contexto

- [src/main.tsx](src/main.tsx)
- [src/modules/leaves/hooks/useLeaves.ts](src/modules/leaves/hooks/useLeaves.ts)
- [src/modules/leaves/views/EditorView.tsx](src/modules/leaves/views/EditorView.tsx)
- [src/modules/study/hooks/useFlashcards.ts](src/modules/study/hooks/useFlashcards.ts)
- [src/modules/study/studyStore.ts](src/modules/study/studyStore.ts)
- [src/modules/study/views/StudyView.tsx](src/modules/study/views/StudyView.tsx)
- [src/core/api/client.ts](src/core/api/client.ts)
- [server/routes.js](server/routes.js)

## Regras importantes para futuras alterações

- Não reintroduzir refetches agressivos em rotas de edição sem necessidade.
- Evitar invalidar queries inteiras quando o objetivo for apenas atualizar um item específico.
- Preservar o estado local do editor sempre que possível (usar refs de controle como `initialSyncDoneRef`).
- Manter as atualizações de cache idempotentes: se o valor já estiver correto, não sobrescrever.
- Para estado de sessão de estudo, SEMPRE usar a Zustand Store (`studyStore`) em vez de `useState` local, para garantir persistência entre remounts.
- Limpar timeouts e timers em `useEffect` de cleanup para evitar memory leaks.
- Se a mudança for relacionada a render, validar primeiro o fluxo de estados locais, cache do React Query e sincronização com o TipTap.

## Verificação feita

A build do projeto foi validada com sucesso após os ajustes:

- comando executado: npm run build

## Observação para agentes de IA

Se você for trabalhar em render, autosave, editor, flashcards, resumo ou cache de dados, comece por esses arquivos antes de mexer em outros pontos do app.
