# 🔍 Análise de Problemas — Revisa Aula

> **Data:** 07/07/2026
> **Escopo:** Frontend (React 19 + Vite 8 + TypeScript) e Backend (NestJS 11 + Prisma ORM 7 + SQLite)

---

## Sumário

1. [🔴 Problemas Críticos](#1--problemas-críticos)
2. [🟡 Problemas de Qualidade e Manutenibilidade](#2--problemas-de-qualidade-e-manutenibilidade)
3. [🟡 Problemas de UX e UI](#3--problemas-de-ux-e-ui)
4. [🟢 Problemas de Performance](#4--problemas-de-performance)
5. [🟢 Problemas de Configuração e DevEx](#5--problemas-de-configuração-e-devex)
6. [📊 Resumo e Priorização](#6--resumo-e-priorização)

---

## 1. 🔴 Problemas Críticos

### 1.1. IA totalmente mockada (funcionalidade falsa)

**Arquivos:** `server/src/leaves/utils/ai-mock.service.ts`

**Problema:** A geração de resumos e flashcards por IA é completamente simulada com templates fixos. Não há integração com nenhum serviço real (OpenAI, Anthropic, etc.).

**Impacto:** O produto não entrega o valor prometido de "geração inteligente". Isso engana o usuário e torna o core diferencial do app inútil.

**Solução:** Integrar com API real de IA (OpenAI, Anthropic Claude, etc.). Usar o Gravity Index para escolher o provider.

**Esforço:** Alto

---

### 1.2. Sem testes automatizados

**Problema:** O projeto não possui testes unitários, de integração ou E2E. Qualquer refatoração corre alto risco de quebrar funcionalidades.

**Impacto:** Dificuldade de evoluir o código com segurança. Regression bugs frequentes.

**Solução:** Implementar ao menos testes unitários para:
- Algoritmo SM-2 (`flashcards.service.ts`)
- Cálculo de estatísticas (`study.service.ts`)
- Hooks críticos (useAuth, useLeaves)
- Componentes principais (EditorView, StudyView)

**Esforço:** Alto

---

### 1.3. `console.log` com token sensível em produção

**Arquivo:** `src/core/api/client.ts` (linha 90)

**Problema:**
```ts
console.log("access: ", accessToken);
```
O access token JWT é logado no console do navegador a cada refresh.

**Impacto:** Vazamento do token de autenticação via console. Qualquer extensão maliciosa ou script de terceiro pode capturá-lo.

**Solução:** Remover o `console.log` ou substituir por logger condicional (`if (process.env.NODE_ENV !== 'production')`).

**Esforço:** Baixo

---

### 1.4. CORS com `origin: true` em produção

**Arquivo:** `server/src/main.ts` (linha 18)

**Problema:**
```ts
const origin = process.env.NODE_ENV === 'production'
  ? process.env.FRONTEND_URL || false
  : true;
```
Em desenvolvimento, `origin: true` permite qualquer origem. Em produção, se `FRONTEND_URL` não for definido, `false` bloqueia tudo.

**Impacto:** Em dev, CORS aberto. Em produção, sem configuração, o app quebra completamente.

**Solução:** Validar a variável `FRONTEND_URL` no startup e lançar erro se não definida em produção.

**Esforço:** Baixo

---

## 2. 🟡 Problemas de Qualidade e Manutenibilidade

### 2.1. Componentes God (muitas responsabilidades)

**Arquivos:** `EditorView.tsx` (~550 linhas), `NotebookView.tsx` (~450 linhas)

**Problema:** Os componentes de View acumulam gerenciamento de estado, lógica de API, validação de formulários, modais, drag & drop, etc.

**Exemplo:** `EditorView.tsx` gerencia editor, sidebar de IA, anotações, autosave, flashcards, resumo, sub-folhas com drag & drop — tudo em um único arquivo.

**Solução:** Extrair responsabilidades em hooks customizados e componentes menores. Separar a lógica do painel de IA em um componente dedicado.

**Esforço:** Alto

---

### 2.2. ESLint configurado incorretamente

**Arquivo:** `eslint.config.js`

**Problema:** A regra `no-restricted-imports` está configurada ao contrário: proíbe imports sem extensão, mas todos os imports do projeto usam extensão explícita (`.tsx`, `.ts`).

**Solução:** Reverter a lógica ou remover a regra, já que TypeScript + Vite resolvem extensões corretamente.

**Esforço:** Baixo

---

### 2.3. Import default vs named export inconsistente

**Exemplos:** Múltiplos arquivos exportam tanto `export function` quanto `export default`, e as importações misturam padrões.

**Solução:** Remover todos os `export default` e usar apenas named exports.

**Esforço:** Baixo

---

### 2.4. Classes Tailwind inline massivas

**Arquivo:** `src/modules/leaves/views/EditorView.tsx`

**Problema:** O `EditorContent` tem uma string de classes Tailwind de ~1500 caracteres inline no JSX, difícil de ler e manter.

**Solução:** Extrair para classes CSS em `index.css` com nomes semânticos como `.editor-content` ou `.tiptap-content`.

**Esforço:** Médio

---

### 2.5. Form aninhado no modal de criação de caderno

**Arquivo:** `src/modules/notebooks/views/DashboardView.tsx`

**Problema:** O modal de criação de notebook tem o botão de submit no `footer` (fora do `<form>`), e há um `<form>` dentro do `children`. No NotebookView o mesmo padrão se repete.

**Solução:** Unificar o submit handler sem forms aninhados.

**Esforço:** Baixo

---

### 2.6. Lógica de "revisados hoje" pode ser imprecisa

**Arquivo:** `server/src/study/study.service.ts`

**Problema:** O cálculo de `reviewedToday` usa `updatedAt` como proxy de "última revisão", mas `updatedAt` muda também na criação do card.

**Status:** ✅ Corrigido parcialmente — agora verifica se o card foi efetivamente revisado (`repetitions > 0 || interval > 0 || easeFactor != 2.5`).

**Melhoria futura:** Adicionar coluna `lastReviewedAt` no modelo `Flashcard` para rastreamento preciso.

---

## 3. 🟡 Problemas de UX e UI

### 3.1. Link "Esqueceu a senha?" quebrado

**Arquivo:** `src/modules/auth/views/LoginView.tsx`

**Problema:** O link aponta para `/forgot-password`, rota que não existe. Usuário que esqueceu a senha fica sem opção de recuperação.

**Solução:** Implementar fluxo de recuperação de senha ou remover o link.

**Esforço:** Médio

---

### 3.2. Skeleton exibido mesmo com dados em cache

**Arquivo:** `src/modules/leaves/views/EditorView.tsx`

**Problema:** A condição `isLoadingLeaf || (leaf && !contentReady)` exibe o skeleton mesmo quando a leaf já está no cache.

**Solução:** Usar `isFetching` + `isStale` em vez de `isLoading` ou pular skeleton para dados em cache.

**Esforço:** Baixo

---

### 3.3. Sem feedback visual ao criar/excluir itens

**Problema:** Operações como criar folha, excluir caderno, criar flashcard não exibem toast/notificação de sucesso.

**Solução:** Adicionar um sistema de toasts ou usar o elemento de status já existente no header.

**Esforço:** Médio

---

### 3.4. Nome da marca inconsistente

**Arquivos:** `LoginView.tsx` ("StudyNotes Flash"), `RegisterView.tsx` ("StudyNotes AI"), Sidebar ("StudyNotes AI")

**Problema:** O nome da aplicação é inconsistente entre as telas.

**Solução:** Padronizar para "StudyNotes AI" em todos os lugares.

**Esforço:** Baixo

---

### 3.5. Indicador de salvamento no editor poderia ser mais visível

**Arquivo:** `src/modules/leaves/views/EditorView.tsx`

**Problema:** O status de salvamento ("Salvando...", "Salvo", "Erro") está no header global, longe do editor. O usuário pode não perceber se o salvamento falhou.

**Solução:** Adicionar indicador local próximo ao editor ou usar um toast.

**Esforço:** Baixo

---

## 4. 🟢 Problemas de Performance

### 4.1. Autosave dispara re-renders mesmo com debounce

**Arquivo:** `src/modules/leaves/views/EditorView.tsx`

**Problema:** `handleEditorUpdate` é chamado a cada caractere digitado, disparando `setLocalContent`, `setLocalRawText`, `editorStatus.setSaveStatus('saving')` em cada tecla.

**Solução:** Debounced local state updates ou usar refs para comparar antes de setar estado.

**Esforço:** Médio

---

### 4.2. AnnotationSidebar faz parsing completo do HTML a cada update

**Arquivo:** `src/modules/leaves/components/AnnotationSidebar.tsx`

**Problema:** A sidebar escaneia o HTML inteiro do editor via DOMParser a cada atualização do editor, mesmo para mudanças não relacionadas a anotações.

**Solução:** Usar `useMemo` ou limitar escaneamento via marks do ProseMirror.

**Esforço:** Médio

---

### 4.3. Re-renderização excessiva do EditorView por `editorStatus`

**Arquivo:** `src/store/editorStatusStore.ts`

**Problema:** O `editorStatus` é usado no AppLayout (fora do EditorView), o que significa que qualquer mudança no status de salvamento causa re-render no layout inteiro.

**Solução:** Separar o indicador de status em um componente dedicado e isolado.

**Esforço:** Baixo

---

## 5. 🟢 Problemas de Configuração e DevEx

### 5.1. Variáveis de ambiente não documentadas

**Problema:** Não há arquivo `.env.example` ou documentação sobre quais variáveis de ambiente são necessárias.

**Solução:** Criar `.env.example` na raiz e em `server/`.

**Esforço:** Baixo

---

### 5.2. Sem lint-staged ou pre-commit hooks

**Problema:** Não há Husky ou lint-staged configurados.

**Solução:** Configurar Husky + lint-staged para rodar ESLint e TypeScript check antes de commits.

**Esforço:** Baixo

---

### 5.3. Sem validação de environment no startup

**Arquivo:** `server/src/main.ts`

**Problema:** O servidor inicia mesmo sem as variáveis de ambiente essenciais (`JWT_SECRET`, `DATABASE_URL`).

**Solução:** Adicionar validação no bootstrap com `class-validator` ou joi.

**Esforço:** Baixo

---

### 5.4. db.json.backup não utilizado

**Arquivo:** `server/db.json.backup`

**Problema:** Arquivo sobrando da migração Express → NestJS.

**Solução:** Remover após confirmar que todos os dados foram migrados.

**Esforço:** Muito Baixo

---

## 6. 📊 Resumo e Priorização

| Prioridade | Categoria | Problema | Esforço |
|------------|-----------|----------|---------|
| 🔴 Crítico | Funcionalidade | IA mockada (funcionalidade falsa) | Alto |
| 🔴 Crítico | Qualidade | Sem testes automatizados | Alto |
| 🔴 Crítico | Segurança | console.log do token JWT | Baixo |
| 🔴 Crítico | Config | CORS sem fallback adequado em produção | Baixo |
| 🟡 Alto | Manutenibilidade | God Components (EditorView, NotebookView) | Alto |
| 🟡 Alto | Qualidade | ESLint configurado incorretamente | Baixo |
| 🟡 Alto | UX | Link "Esqueceu a senha?" quebrado | Médio |
| 🟡 Alto | UX | Sem toasts/notificações de sucesso | Médio |
| 🟡 Médio | Qualidade | Classes Tailwind inline massivas | Médio |
| 🟡 Médio | UX | Skeleton mesmo com cache | Baixo |
| 🟡 Médio | UX | Marca inconsistente (Flash vs AI) | Baixo |
| 🟢 Baixo | Performance | Autosave com excesso de re-renders | Médio |
| 🟢 Baixo | Performance | AnnotationSidebar DOMParser excessivo | Médio |
| 🟢 Baixo | Manutenibilidade | Import default vs named export | Baixo |
| 🟢 Baixo | Manutenibilidade | Form aninhado no modal | Baixo |
| 🟢 Baixo | Config | Sem .env.example | Baixo |
| 🟢 Baixo | Config | Sem pre-commit hooks | Baixo |
| 🟢 Baixo | Config | db.json.backup inútil | Muito Baixo |
| 🟢 Baixo | Backend | Validação de env no startup | Baixo |

---

## Problemas resolvidos desde a última análise

| Problema | Status | Data |
|----------|--------|------|
| Senhas em texto puro → bcrypt via NestJS AuthService | ✅ Resolvido | Migração NestJS |
| Chaves JWT hardcoded → env vars via ConfigService | ✅ Resolvido | Migração NestJS |
| Owner check ausente → Guards + verificação por userId | ✅ Resolvido | Migração NestJS |
| Cookie secure: false → configurável via env | ✅ Resolvido | Migração NestJS |
| DB JSON sem concorrência → SQLite + Prisma transações | ✅ Resolvido | Migração NestJS |
| Refresh token sem rotação → rotação implementada | ✅ Resolvido | Migração NestJS |
| DiceBear v7 obsoleto → v9 com fallback | ✅ Resolvido | Migração NestJS |
| Cálculo de reviewedToday impreciso | ✅ Corrigido | 07/07/2026 |
| Estudo sem refresh manual | ✅ Corrigido | 07/07/2026 |
| Editor com altura fixa (80vh) | ✅ Corrigido | 07/07/2026 |
| saveSession sem transação | ✅ Corrigido | 07/07/2026 |
| Overflow horizontal em nomes de tag (TagsManagementView) | ✅ Corrigido | 08/07/2026 |
| Scroll lateral no EditorView (CSS overflow gotcha) | ✅ Corrigido | 08/07/2026 |
| Texto vazando do container do editor | ✅ Corrigido | 08/07/2026 |
| Scroll lateral global no <main> (AppLayout) | ✅ Corrigido | 08/07/2026 |
| God Component EditorView (~550 linhas) | ✅ Corrigido | 08/07/2026 |
| 400 Bad Request no auto-save (título vazio) | ✅ Corrigido | 08/07/2026 |
| CSS overflow-x-hidden sem overflow-y (CSS Gotcha audit) | ✅ Corrigido | 08/07/2026 |
| console.log do token JWT no client.ts | ✅ Corrigido | Anterior a 08/07/2026 |

---

*Documento gerado em 07/07/2026 por análise estática do código-fonte.*
