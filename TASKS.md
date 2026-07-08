# 📋 Próximas Tarefas — Revisa Aula

> Prioridades definidas com base no impacto e esforço estimado.

---

## 🔴 Crítico (Prioridade Máxima)

### 1. Integrar IA real (OpenAI / Anthropic)
- **Arquivo:** `server/src/leaves/utils/ai-mock.service.ts`
- **Descrição:** Substituir o mock de IA por API real. Usar Gravity Index para escolher o provider.
- **Por quê:** O core diferencial do app não funciona (resumos e flashcards são templates fixos).
- **Esforço:** Alto

### 2. Implementar testes automatizados
- **Alvos prioritários:** Algoritmo SM-2 (`flashcards.service.ts`), hooks useEditorContent/useEditorActions, cálculo de stats (`study.service.ts`)
- **Por quê:** Refatorações recentes (EditorView) mostram que sem testes, bugs passam despercebidos.
- **Esforço:** Alto

### 3. Remover `console.log` do token JWT
- **Arquivo:** `src/core/api/client.ts` (linha 90)
- **Descrição:** `console.log("access: ", accessToken)` vaza o token no console.
- **Esforço:** Baixo

### 4. Validar `FRONTEND_URL` em produção
- **Arquivo:** `server/src/main.ts`
- **Descrição:** Sem `FRONTEND_URL` configurada em produção, o CORS bloqueia tudo.
- **Esforço:** Baixo

---

## 🟡 Alta Prioridade

### 5. Refatorar NotebookView (~450 linhas)
- **Descrição:** Seguir o mesmo padrão usado no EditorView: extrair hooks customizados para reduzir o God Component.
- **Referência:** Extração de `useEditorContent` e `useEditorActions` do EditorView.
- **Esforço:** Alto

### 6. Corrigir ESLint configurado incorretamente
- **Arquivo:** `eslint.config.js`
- **Descrição:** Regra `no-restricted-imports` ao contrário: proíbe imports sem extensão, mas o projeto usa extensão explícita.
- **Esforço:** Baixo

### 7. Corrigir link "Esqueceu a senha?"
- **Arquivo:** `src/modules/auth/views/LoginView.tsx`
- **Descrição:** Link aponta para `/forgot-password` que não existe.
- **Solução:** Implementar fluxo de recuperação ou remover o link.
- **Esforço:** Médio

### 8. Adicionar toasts de sucesso nas operações
- **Descrição:** Hoje só temos toasts de erro. Adicionar feedback positivo: "Caderno criado", "Tag excluída", etc.
- **Ferramenta:** Usar o `useToastStore` já criado com `type: 'success'`.
- **Esforço:** Médio

---

## 🟡 Média Prioridade

### 9. Unificar named exports (remover export default)
- **Descrição:** Projeto mistura `export default` e named exports. Padronizar.
- **Esforço:** Baixo

### 10. Extrair classes Tailwind massivas para CSS
- **Arquivo:** `EditorView.tsx` (classes inline no EditorContent)
- **Esforço:** Médio

### 11. Corrigir form aninhado nos modais
- **Arquivos:** `DashboardView.tsx`, `NotebookView.tsx`
- **Descrição:** Botão de submit do modal está fora do `<form>`.
- **Esforço:** Baixo

### 12. Skeleton exibido mesmo com cache
- **Arquivo:** `EditorView.tsx`
- **Descrição:** `isLoadingLeaf` exibe skeleton mesmo quando leaf está em cache.
- **Solução:** Usar `isFetching` + `isStale`.
- **Esforço:** Baixo

---

## 🟢 Baixa Prioridade

### 13. Criar `.env.example`
- **Descrição:** Documentar variáveis de ambiente necessárias.
- **Esforço:** Baixo

### 14. Configurar Husky + lint-staged
- **Descrição:** Rodar ESLint e TypeScript check antes de commits.
- **Esforço:** Baixo

### 15. Validação de env no startup do backend
- **Arquivo:** `server/src/main.ts`
- **Descrição:** Servidor inicia mesmo sem `JWT_SECRET` ou `DATABASE_URL`.
- **Esforço:** Baixo

### 16. Remover `db.json.backup`
- **Descrição:** Arquivo residual da migração Express → NestJS.
- **Esforço:** Muito Baixo

---

## 📊 Resumo

| Prioridade | Qtd | Principais |
|------------|-----|------------|
| 🔴 Crítico | 3 | IA real, testes, CORS produção |
| 🟡 Alta | 4 | NotebookView, ESLint, forgot password, toasts sucesso |
| 🟡 Média | 4 | named exports, Tailwind CSS, forms, skeleton |
| 🟢 Baixa | 4 | env.example, Husky, validação env, db.json |

---

*Gerado em 08/07/2026 após refatoração do EditorView, sistema de toasts e correções de overflow.*
