# 🔍 Análise de Problemas — Revisa Aula

> **Data:** 30/06/2026
> **Escopo:** Frontend (React 19 + TypeScript + Vite) e Backend (Express + JSON Database)

---

## Sumário

1. [🔴 Problemas Críticos de Segurança](#1--problemas-críticos-de-segurança)
2. [🔴 Problemas de Arquitetura e Design](#2--problemas-de-arquitetura-e-design)
3. [🟡 Problemas de Qualidade de Código](#3--problemas-de-qualidade-de-código)
4. [🟡 Problemas de Performance](#4--problemas-de-performance)
5. [🟡 Problemas de UX e UI](#5--problemas-de-ux-e-ui)
6. [🟢 Problemas de Manutenibilidade](#6--problemas-de-manutenibilidade)
7. [🟢 Problemas de Configuração e Dev Experience](#7--problemas-de-configuração-e-dev-experience)
8. [📊 Resumo e Priorização](#8--resumo-e-priorização)

---

## 1. 🔴 Problemas Críticos de Segurança

### 1.1. Senhas armazenadas em texto puro

**Arquivo:** `server/routes.js` (linhas 58, 122, 194)

**Problema:** As senhas dos usuários são armazenadas **sem nenhum hash** no banco de dados JSON. O próprio código reconhece isso com o comentário: `// Em produção, usar bcryptjs. Para fins básicos, armazenamos simples`.

```js
const newUser = {
  // ...
  password, // Em produção, usar bcryptjs. Para fins básicos, armazenamos simples
};
```

**Impacto:** Qualquer pessoa com acesso ao arquivo `db.json` (ou um atacante que explore uma vulnerabilidade) pode ler todas as senhas dos usuários em texto claro.

**Solução:** Usar `bcryptjs` ou `bcrypt` com salt rounds (≥ 10) para hash das senhas antes do armazenamento e comparação.

---

### 1.2. Chaves JWT hardcoded

**Arquivos:** `server/routes.js` (linha 7) e `server/authMiddleware.js` (linha 4)

**Problema:** As chaves secretas para assinatura dos tokens JWT estão **hardcoded** no código-fonte:

```js
export const JWT_SECRET = 'super-secret-key-revisa-aula'; // authMiddleware.js
const REFRESH_SECRET = 'super-secret-refresh-key-revisa-aula'; // routes.js
```

**Impacto:** Como o código está versionado no Git, qualquer pessoa com acesso ao repositório tem as chaves secretas. Isso permite forjar tokens JWT, assumir identidade de qualquer usuário e acessar todas as rotas protegidas.

**Solução:** Usar variáveis de ambiente (e.g., `process.env.JWT_SECRET`) com fallback apenas para desenvolvimento local, e garantir que o `.env` não seja versionado.

---

### 1.3. Ausência de validação de propriedade do recurso (Owner Check)

**Arquivos:** `server/routes.js` — rotas de leaves (`/leaves/:leafId`, `/leaves/:leafId/summary`, etc.)

**Problema:** As rotas de folhas (leaves) e flashcards não verificam se o recurso pertence ao usuário autenticado. Apenas os cadernos (notebooks) têm essa verificação (`nb.userId === req.user.id`).

Por exemplo, na rota `GET /leaves/:leafId`:
```js
router.get('/leaves/:leafId', authMiddleware, async (req, res) => {
  const leaves = await db.get('leaves');
  const leaf = leaves.find(l => l.id === req.params.leafId);
  // ❌ NÃO verifica se leaf pertence ao notebook do usuário
});
```

**Impacto:** Um usuário autenticado pode acessar, modificar ou deletar folhas e flashcards de **outros usuários**, desde que saiba ou adivinhe os IDs (UUIDs não são imprevisíveis o suficiente como único mecanismo de segurança).

**Solução:** Verificar a cadeia de propriedade: leaf → notebook → userId === req.user.id.

---

### 1.4. `secure: false` nos cookies de refresh token

**Arquivo:** `server/routes.js` (linhas 76-79, 140-143)

**Problema:** O cookie de refresh token é configurado com `secure: false`, o que significa que ele é enviado em conexões HTTP (não apenas HTTPS).

```js
res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: false, // ⚠️ local development
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000
});
```

**Impacto:** Em produção, o token de refresh pode ser interceptado em ataques Man-in-the-Middle.

**Solução:** Tornar `secure` configurável via variável de ambiente, ativando-o em produção.

---

### 1.5. CORS com `origin: true`

**Arquivo:** `server/index.js` (linha 10)

**Problema:** `origin: true` reflete dinamicamente qualquer origem da requisição, efetivamente permitindo acesso de qualquer domínio.

```js
app.use(cors({
  origin: true, // Reflete dinamicamente a origem da requisição
  credentials: true,
}));
```

**Impacto:** Qualquer site malicioso pode fazer requisições autenticadas (com cookies) para a API se um usuário estiver logado.

**Solução:** Especificar origens permitidas explicitamente (e.g., `http://localhost:5173` para dev, e o domínio de produção).

---

## 2. 🔴 Problemas de Arquitetura e Design

### 2.1. Banco de dados JSON em arquivo único (sem concorrência)

**Arquivo:** `server/database.js`

**Problema:** O "banco de dados" é um arquivo JSON (`db.json`) lido e escrito inteiramente em cada operação. O arquivo cresce linearmente com o uso. Não há proteção contra race conditions em requisições concorrentes — duas requisições simultâneas podem corromper os dados.

```js
async function saveDb() {
  await fs.writeFile(dbPath, JSON.stringify(inMemoryDb, null, 2), 'utf8');
}
```

**Impacto:** Instabilidade em cenários de múltiplos usuários simultâneos. Perda de dados em requisições concorrentes.

**Solução:** Migrar para SQLite (com `better-sqlite3`) ou PostgreSQL. Pelo menos implementar locks de leitura/escrita.

---

### 2.2. Geração de resumo e flashcards totalmente mockada

**Arquivo:** `server/routes.js` — rotas `POST /leaves/:leafId/summary` e `POST /leaves/:leafId/flashcards`

**Problema:** As funcionalidades de "IA" são completamente simuladas com templates fixos — não há integração com nenhum serviço real de IA (OpenAI, Anthropic, etc.). O "resumo" gerado é sempre o mesmo texto genérico com placeholder, e os flashcards são 3 cards idênticos com variação de template.

```js
const summaryText = `### Resumo da Aula: ${cleanTitle}
Este resumo foi gerado dinamicamente pela inteligência artificial...`;
```

**Impacto:** O produto não entrega o valor prometido de "geração inteligente de resumos e flashcards". Isso engana o usuário e torna o core diferencial do app inútil.

**Solução:** Integrar com uma API real de IA (OpenAI, Anthropic Claude, etc.) usando `<NOME_DA_INSTITUIÇÃO>` e o Gravity Index para escolher o provider.

---

### 2.3. Estado gerenciado em dois lugares (Zustand + React Query) sem boundary claro

**Arquivos:** Múltiplos (stores do Zustand e cache do React Query)

**Problema:** O projeto usa tanto Zustand (para estado UI e sessão de estudo) quanto React Query (para estado do servidor). Porém, o hook `useAuth` mistura os dois: dados de perfil são armazenados tanto no Zustand (`useAuthStore`) quanto no cache do React Query (`queryClient.setQueryData(['profile'], data.user)`). Isso cria duas fontes de verdade para o mesmo dado.

```js
// useAuth.ts
const { login, logout, isAuthenticated, user, accessToken } = useAuthStore();
// ...
onSuccess: (data) => {
  login(data.user, data.accessToken);          // Zustand
  queryClient.setQueryData(['profile'], data.user); // React Query
},
```

**Impacto:**Possíveis inconsistências se um dos dois for atualizado sem o outro. Maior complexidade cognitiva para novos desenvolvedores.

**Solução:** Definir uma estratégia clara: React Query para dados de servidor, Zustand apenas para estado UI local (tema, sidebar, sessão de estudo).

---

### 2.4. Refresh token sem rotação

**Arquivo:** `server/routes.js` (linhas 155-172)

**Problema:** O refresh token nunca é rotacionado. O mesmo token pode ser usado múltiplas vezes para obter novos access tokens. Se vazar, o atacante pode renovar a sessão indefinidamente.

```js
router.post('/auth/refresh', async (req, res) => {
  // ...
  const accessToken = jwt.sign(...);
  return res.json({ accessToken });
  // ❌ Não gera novo refresh token
});
```

**Solução:** Gerar um novo refresh token a cada requisição de refresh e invalidar o anterior.

---

## 3. 🟡 Problemas de Qualidade de Código

### 3.1. ESLint com regra restritiva de imports que pode ser ignorada

**Arquivo:** `eslint.config.js`

**Problema:** A regra `no-restricted-imports` proíbe imports sem extensão de arquivo (e.g., `from './Component'` em vez de `from './Component/index.tsx'`). Porém, em nenhum lugar do projeto isso é seguido — todos os imports usam extensão explícita (e.g., `from './EditorBubbleMenu'`) que não deveria ser necessária com o Vite. A regra foi configurada ao contrário: deveria proibir imports COM extensão de arquivo, não sem.

```js
'no-restricted-imports': ['error', {
  patterns: [
    { group: ['./**/!(*.*)'], message: '...' },
  ],
}],
```

**Impacto:** A regra de lint não está fazendo o que se propõe e pode causar confusão. Na verdade, todos os imports atuais usam `.tsx` e `.ts` explicitamente, o que deveria ser o comportamento proibido, não o permitido.

**Solução:** Reverter a lógica ou remover a regra (já que TypeScript + Vite resolvem extensões corretamente).

---

### 3.2. Comentários em português misturados com código em inglês

**Arquivos:** Múltiplos (especialmente views e services)

**Problema:** Código fonte usa nomes de variáveis e funções em inglês (boa prática), mas comentários estão em português. As mensagens de erro no frontend estão em português, enquanto as do servidor misturam inglês e português. Falta consistência.

**Impacto:** Baixo para funcionalidade, mas dificulta colaboração internacional e contribui para uma sensação de falta de polish.

**Solução:** Decidir por um idioma (recomendado: inglês para tudo, com i18n para UI) ou padronizar português para todo o ecossistema.

---

### 3.3. `console.log` e `console.error` espalhados sem tratamento adequado

**Arquivos:** `core/api/client.ts`, `views/EditorView.tsx`, `views/StudyView.tsx`, `views/NotebookView.tsx`, `views/DashboardView.tsx`, `server/routes.js`, `server/index.js`

**Problema:** Há múltiplos `console.log` e `console.error` usados como tratamento de erro e debug no código de produção:

```ts
console.log("access: ", accessToken); // client.ts (linha 90)
console.log("event: ", Object.keys(e.nativeEvent)); // StudyView.tsx (linha 88)
console.error('Erro no auto-save:', error); // EditorView.tsx (linha 227)
```

**Impacto:** `console.log` em produção pode vazar informações sensíveis. `console.error` como único tratamento de erro não oferece feedback ao usuário e polui o console.

**Solução:** Implementar um sistema de logging adequado (e.g., sentry, logger estruturado) e usar `toast` ou notificações para feedback ao usuário.

---

### 3.4. Tipagem insegura no `setQueryData`

**Arquivo:** `hooks/useLeaves.ts` (linhas 100-108)

**Problema:** O hook `summaryMutation` faz `setQueryData` com tipagem `any` implícita, e o próprio README reconhece isso como problema:

```ts
queryClient.setQueryData(['leaves', leafId], (old: { summary?: string } | undefined) => {
  if (!old) return old;
  return { ...old, summary: data.summary };
});
```

**Impacto:** Perda de segurança de tipos. Se a estrutura do Leaf mudar, esse código pode silenciosamente produzir estados inválidos no cache.

**Solução:** Tipar corretamente com `Leaf` em vez do objeto genérico.

---

### 3.5. Estilos CSS inline e classes Tailwind massivas

**Arquivo:** `EditorView.tsx` (linha ~170)

**Problema:** O componente `EditorView` contém classes Tailwind CSS extremamente longas (centenas de caracteres) inline no JSX para estilizar o `EditorContent`. Essas classes são difíceis de ler, manter e reaproveitar.

```tsx
className="w-full h-full [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:leading-relaxed [&_.ProseMirror]:text-base [&_.ProseMirror]:caret-slate-800 ..."
```

**Impacto:** Dificuldade de manutenção. Qualquer mudança de estilo requer editar uma string gigante.

**Solução:** Extrair para classes CSS no `index.css` ou `App.css` com nomes semânticos como `.editor-content` ou `.tiptap-content`.

---

## 4. 🟡 Problemas de Performance

### 4.1. Autosave dispara a cada digitação (mesmo com debounce)

**Arquivo:** `EditorView.tsx`

**Problema:** Embora o debounce seja aplicado (1.5s), as funções `setLocalContent`, `setLocalRawText` e `setSaveStatus('saving')` são chamadas **a cada caractere digitado** no `onUpdate` do editor, porque o callback executa imediatamente para atualizar o estado local. O debounce só atrasa o salvamento no servidor.

```ts
const handleEditorUpdate = useCallback(({ editor }) => {
  if (isApplyingRemote.current) return;
  setLocalContent(ed.getHTML());  // ← executa em cada tecla
  setLocalRawText(ed.getText());  // ← executa em cada tecla
  setSaveStatus('saving');        // ← executa em cada tecla
}, []);
```

**Impacto:** Cada tecla pressionada no editor dispara pelo menos 3 atualizações de estado (setLocalContent + setLocalRawText + setSaveStatus), que causam re-renderizações em cascata. Em dispositivos mais lentos ou com documentos longos, isso pode causar lag perceptível.

**Solução:** Debounce também os estados locais ou atualize-os apenas quando necessário (e.g., apenas no salvamento).

---

### 4.2. Re-renderização desnecessária da AnnotationSidebar

**Arquivo:** `components/AnnotationSidebar.tsx`

**Problema:** A sidebar de anotações escaneia o HTML inteiro do editor a cada atualização (`editor.on('update')`) e atualiza o estado com `setAnnotations`. Isso é feito no componente pai via `useEffect`, que reexecuta todo parsing mesmo para mudanças de texto não relacionadas a anotações.

```ts
useEffect(() => {
  const updateAnnotations = () => {
    const html = editor.getHTML();
    const parser = new DOMParser(); // ← Parsing completo do HTML
    const doc = parser.parseFromString(html, 'text/html');
    const marks = doc.querySelectorAll('span.annotation-anchor[data-annotation]');
    // ...
  };
  editor.on('update', updateAnnotations);
  return () => { editor.off('update', updateAnnotations); };
}, [editor]);
```

**Impacto:** A cada caractere digitado, o HTML completo do editor é parseado com DOMParser. Com documentos grandes, isso pode causar queda de performance.

**Solução:** Usar `useMemo` com dependência no HTML, ou limitar o escaneamento a mudanças que afetam anotações (usando a API do TipTap/ProseMirror para detectar marks).

---

### 4.3. Skeleton carregado mesmo quando leaf está em cache

**Arquivo:** `EditorView.tsx`

**Problema:** A condição `if (isLoadingLeaf || (leaf && !contentReady))` exibe o skeleton **sempre** que `!contentReady`, mesmo quando a leaf já está no cache do React Query. O usuário vê o skeleton mesmo para navegações instantâneas entre folhas.

**Impacto:** Experiência de usuário subótima para navegação entre folhas já carregadas.

**Solução:** Skip do skeleton quando os dados vêm do cache (e.g., verificar `isStale` ou `isFetching` em vez de `isLoading`).

---

## 5. 🟡 Problemas de UX e UI

### 5.1. Botão "Esqueceu a senha?" leva a rota inexistente

**Arquivo:** `LoginView.tsx` (linha 111)

**Problema:** O link "Esqueceu a senha?" aponta para `/forgot-password`, mas essa rota **não existe** no sistema:

```tsx
<Link to="/forgot-password" className="...">
  Esqueceu a senha?
</Link>
```

O catch-all (`path: '*'`) redireciona para `/dashboard`, que é uma rota privada. Se o usuário não estiver logado, será redirecionado de volta ao login em um loop infinito.

**Impacto:** Link quebrado. Usuário que esqueceu a senha fica sem opção de recuperação.

**Solução:** Implementar a funcionalidade de "esqueci minha senha" ou remover o link.

---

### 5.2. Marca d'água "StudyNotes Flash" vs "StudyNotes AI"

**Arquivos:** `LoginView.tsx` (linha 47) e `RegisterView.tsx` (linha 49)

**Problema:** O nome da aplicação é inconsistente entre as duas telas de autenticação:

- **Login:** "StudyNotes **Flash**"
- **Register:** "StudyNotes **AI**"

**Impacto:** Pequeno, mas transmite falta de cuidado com a identidade visual.

**Solução:** Padronizar o nome da marca.

---

### 5.3. Navegação quebrada ao fechar modal de criação de caderno

**Arquivo:** `DashboardView.tsx`

**Problema:** O modal de criação de notebook tem dois `form` aninhados: o `form` do `handleSubmit` dentro do `Modal` + o form dentro do `children` do modal. Quando o usuário clica "Criar Caderno" no footer, ele está fora do form interno.

```tsx
<Modal
  footer={
    <Button onClick={handleSubmit(onSubmit)}>Criar Caderno</Button>
  }
>
  <form onSubmit={handleSubmit(onSubmit)}>... {/* ❌ Form dentro de form */}
  </form>
</Modal>
```

**Impacto:** O botão de submit no footer pode não disparar a validação corretamente, e há forms HTML aninhados (comportamento indefinido por especificação HTML).

**Solução:** Remover o `form` do `children` ou mover o submit handler para o botão do footer.

---

## 6. 🟢 Problemas de Manutenibilidade

### 6.1. Ausência total de testes automatizados

**Problema:** O projeto não possui **nenhum teste** — nem unitário, nem de integração, nem end-to-end. Conforme mencionado no próprio README na seção de melhorias planejadas.

**Impacto:** Qualquer refatoração ou nova funcionalidade corre alto risco de quebrar funcionalidades existentes sem ser detectado.

**Solução:** Implementar testes unitários para hooks (React Testing Library), serviços, e componentes críticos como o editor e o algoritmo SM-2.

---

### 6.2. Componentes com muitas responsabilidades (God Components)

**Arquivos:** `EditorView.tsx`, `NotebookView.tsx`, `DashboardView.tsx`

**Problema:** Os componentes de View acumulam múltiplas responsabilidades:
- `EditorView`: gerencia editor, sidebar de IA, anotações, autosave, flashcards, resumo
- `NotebookView`: exibe dados, gerencia modais de criação/edição/exclusão, navegação

**Exemplo:** `EditorView.tsx` tem ~280 linhas com ~10 estados diferentes, 5 efeitos, lógica de editor, painel de IA, autosave, anotações, etc.

**Impacto:** Dificuldade de testar, entender e modificar. Alto acoplamento.

**Solução:** Extrair responsabilidades em hooks customizados e componentes menores.

---

### 6.3. Lógica de autosave frágil com race conditions

**Arquivo:** `EditorView.tsx`

**Problema:** A lógica de autosave usa `useRef` para rastrear o último estado salvo e `isFirstRender` para evitar salvar na montagem. Porém, não há proteção contra:
1. Salvamento concorrente (duas chamadas simultâneas se o debounce resetar)
2. Salvamento após desmontagem do componente
3. Estado do servidor mais recente sobrescrito por estado local desatualizado (caso o usuário edite enquanto o servidor está sendo atualizado)

**Solução:** Usar `useRef` para armazenar o último `AbortController`, cancelar salvamentos pendentes no unmount, e verificar timestamps.

---

### 6.4. Duplicação de código entre LoginView e RegisterView

**Arquivos:** `LoginView.tsx` e `RegisterView.tsx`

**Problema:** Os dois componentes compartilham ~70% de código duplicado: estrutura de layout, gradiente de fundo, efeitos de blur radial, header com logo, estilos de card glassmorphism, tratamento de erro, etc.

**Impacto:** Qualquer mudança visual precisa ser replicada em dois lugares.

**Solução:** Extrair um componente `AuthLayout` ou `AuthCard` compartilhado.

---

## 7. 🟢 Problemas de Configuração e Dev Experience

### 7.1. Servidor sem nodemon ou hot-reload

**Arquivo:** `server/package.json`

**Problema:** O script `dev` do servidor usa apenas `node index.js`, sem nodemon, ts-node ou qualquer ferramenta de hot-reload.

```json
"scripts": {
  "start": "node index.js",
  "dev": "node index.js" // ❌ Mesmo que start
}
```

**Impacto:** Desenvolvedor precisa reiniciar manualmente o servidor a cada mudança nos arquivos do backend.

**Solução:** Adicionar `nodemon` como dependência de desenvolvimento e criar script `"dev": "npx nodemon index.js"`.

---

### 7.2. Sem lint-staged ou pre-commit hooks

**Problema:** Não há configuração de `husky`, `lint-staged` ou qualquer git hook para garantir qualidade do código antes do commit.

**Impacto:** Código com problemas de lint ou formatação pode ser commitado acidentalmente.

**Solução:** Configurar Husky + lint-staged para rodar ESLint e TypeScript check antes de cada commit.

---

### 7.3. Variáveis de ambiente não documentadas

**Problema:** Embora exista `import.meta.env.VITE_API_URL` no `client.ts`, não há arquivo `.env.example`, `.env` ou documentação sobre quais variáveis de ambiente são necessárias para rodar o projeto.

**Impacto:** Novo desenvolvedor pode não saber que precisa configurar `VITE_API_URL` se a API estiver em porta diferente.

**Solução:** Criar `.env.example` com todas as variáveis documentadas.

---

### 7.4. Uso inconsistente de import default vs named export

**Exemplos:**
- `export const Button` + importação como `{ Button }` ✔️
- `export default useAuth` + importação como `{ useAuth }` (named import de default export) ⚠️

**Arquivos:** `hooks/useAuth.ts`, `hooks/useLeaves.ts`, etc.

**Problema:** Alguns arquivos exportam named exports e também `export default`, e as importações ora usam default import, ora named import. Exemplo em `useAuth.ts`:

```ts
export function useAuth() { ... }
export default useAuth;
```

E em `LoginView.tsx`:
```ts
import { useAuth } from '../hooks/useAuth'; // Named import do default export
```

**Impacto:** Código confuso. O leitor precisa verificar se está importando o named export correto ou o default.

**Solução:** Remover todos os `export default` e usar apenas named exports consistentemente.

---

### 7.5. Robô do DiceBear provavelmente quebrado

**Arquivo:** `server/routes.js` (linha 60)

**Problema:** A URL de avatar usa `api.dicebear.com/7.x/adventurer/svg`. A API DiceBear mudou para v8+ e o endpoint `/7.x` pode não funcionar mais.

```js
avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
```

**Solução:** Atualizar para a versão mais recente da API ou usar um fallback.

---

## 8. 📊 Resumo e Priorização

| Prioridade | Categoria | Problema | Esforço |
|------------|-----------|----------|---------|
| 🔴 Crítico | Segurança | Senhas em texto puro | Baixo |
| 🔴 Crítico | Segurança | Chaves JWT hardcoded | Baixo |
| 🔴 Crítico | Segurança | Owner check ausente em leaves/flashcards | Médio |
| 🔴 Crítico | Arquitetura | IA mockada (funcionalidade falsa) | Alto |
| 🔴 Crítico | Segurança | CORS com origem aberta | Baixo |
| 🔴 Crítico | Arquitetura | DB JSON sem concorrência | Alto |
| 🟡 Alto | Segurança | Cookie secure: false | Baixo |
| 🟡 Alto | Segurança | Refresh token sem rotação | Baixo |
| 🟡 Alto | Qualidade | ESLint configurado incorretamente | Baixo |
| 🟡 Alto | UX | Link "Esqueceu a senha?" quebrado | Baixo |
| 🟡 Alto | UX | Marca inconsistente (Flash vs AI) | Baixo |
| 🟡 Médio | Performance | Autosave com excesso de re-renders | Médio |
| 🟡 Médio | Performance | AnnotationSidebar com parsing excessivo | Médio |
| 🟡 Médio | Arquitetura | Duas fontes de verdade (Zustand + RQ) | Médio |
| 🟢 Baixo | Manutenibilidade | Sem testes automatizados | Alto |
| 🟢 Baixo | Manutenibilidade | God Components (EditorView, etc.) | Alto |
| 🟢 Baixo | Manutenibilidade | Código duplicado (Login/Register) | Baixo |
| 🟢 Baixo | DevEx | Sem nodemon no servidor | Baixo |
| 🟢 Baixo | DevEx | Sem .env.example | Baixo |

---

*Documento gerado automaticamente em 30/06/2026 por análise estática do código-fonte.*
