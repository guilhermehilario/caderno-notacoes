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
- **Alvos prioritários:** Algoritmo SM-2 (`flashcards.service.ts`), hooks do planning, cálculo de stats (`study.service.ts`)
- **Por quê:** Novas funcionalidades de planejamento aumentaram a superfície de possíveis bugs.
- **Esforço:** Alto

### 3. Remover `console.log` do token JWT
- **Arquivo:** `src/core/api/client.ts`
- **Descrição:** `console.log("access: ", accessToken)` vaza o token no console.
- **Esforço:** Baixo

### 4. Validar `FRONTEND_URL` em produção
- **Arquivo:** `server/src/main.ts`
- **Descrição:** Sem `FRONTEND_URL` configurada em produção, o CORS bloqueia tudo.
- **Esforço:** Baixo

---

## 🟡 Alta Prioridade

### 5. Refatorar NotebookView (~450 linhas)
- **Descrição:** Seguir o mesmo padrão usado no EditorView: extrair hooks customizados.
- **Referência:** Extração de `useEditorContent` e `useEditorActions` do EditorView.
- **Esforço:** Alto

### 6. Aplicar cor de destaque do Planning na UI
- **Arquivo:** `src/store/planningSettingsStore.ts`, componentes do planning
- **Descrição:** `accentColor` é salvo nas settings mas não é aplicado visualmente nos componentes.
- **Solução:** Usar `accentColor` para classes dinâmicas (ex: `text-${accentColor}-500`) nos ícones e botões do planning.
- **Esforço:** Médio

### 7. Corrigir ESLint configurado incorretamente
- **Arquivo:** `eslint.config.js`
- **Descrição:** Regra `no-restricted-imports` ao contrário.
- **Esforço:** Baixo

### 8. Adicionar toasts de sucesso nas operações
- **Descrição:** Hoje só temos toasts de erro. Adicionar feedback positivo: "Caderno criado", "Meta atualizada", etc.
- **Esforço:** Médio

---

## 🟡 Média Prioridade

### 9. Unificar named exports (remover export default)
- **Esforço:** Baixo

### 10. Extrair classes Tailwind massivas para CSS
- **Arquivo:** `EditorView.tsx`
- **Esforço:** Médio

### 11. Skeleton exibido mesmo com cache
- **Arquivo:** `EditorView.tsx`
- **Solução:** Usar `isFetching` + `isStale`.
- **Esforço:** Baixo

### 12. Adicionar notificações push (Service Worker)
- **Descrição:** Notificações mesmo com o app fechado, usando Web Push API.
- **Esforço:** Alto

---

## 🟢 Baixa Prioridade

### 13. Criar `.env.example`
- **Esforço:** Baixo

### 14. Configurar Husky + lint-staged
- **Esforço:** Baixo

### 15. Validação de env no startup do backend
- **Esforço:** Baixo

### 16. Atalhos de teclado para o Pomodoro
- **Descrição:** Espaço para pausar/continuar, Esc para parar.
- **Esforço:** Baixo

### 17. Gráfico semanal de pomodoros no Dashboard
- **Descrição:** Mini gráfico de barras por dia da semana no card de Pomodoro do resumo semanal.
- **Esforço:** Médio

---

## ✅ Concluído na Sessão 08/07/2026

- [x] Módulo de Planejamento (Agenda, Calendário, Cronograma, Metas, Pomodoro) com CRUD via API
- [x] Sidebar com sub-menu expansível para Planejamento
- [x] Mini timer flutuante do Pomodoro (canto inferior direito, visível em todas as páginas)
- [x] Sistema de notificações (navegador + in-app + toast) para eventos, metas e pomodoro
- [x] Configurações do Planejamento (cores, durações, toggles de notificação)
- [x] Resumo semanal no Dashboard (eventos, metas pendentes, pomodoros da semana)
- [x] Planejamento segue esquema de navegação (header, breadcrumbs) das outras telas
- [x] Documentação atualizada (AGENTS.md, README.md, TESTES_POSSIVEIS.md, TASKS.md)

---

## 📊 Resumo

| Prioridade | Qtd | Principais |
|------------|-----|------------|
| 🔴 Crítico | 4 | IA real, testes, token JWT, CORS produção |
| 🟡 Alta | 4 | NotebookView, cor destaque, ESLint, toasts sucesso |
| 🟡 Média | 4 | named exports, Tailwind CSS, skeleton, push notifications |
| 🟢 Baixa | 4 | env.example, Husky, validação env, atalhos teclado, gráfico |

---

*Gerado em 08/07/2026 — Sessão de implementação do módulo Planejamento.*
