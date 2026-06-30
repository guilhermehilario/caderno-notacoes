# Revisa Aula 🚀

Plataforma inteligente para gerenciamento de estudos, criação de resumos e flashcards com repetição espaçada.

---

## 📖 Visão Geral do Projeto

O **Revisa Aula** é um aplicativo completo voltado para estudantes e entusiastas de estudos que desejam organizar seus cadernos acadêmicos, criar notas de aulas (chamadas de **Folhas / Leaves**), gerar resumos inteligentes e criar flashcards para revisar o conteúdo utilizando repetição espaçada.

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 19**: Biblioteca moderna para construção de interfaces de usuário com componentes declarativos.
- **Vite 8**: Ferramenta de build rápida e moderna para o ecossistema frontend.
- **TypeScript**: Superset de JavaScript com tipagem estática que previne erros de desenvolvimento.
- **Tailwind CSS v4**: Engine de estilização de alta performance, utilizando a nova arquitetura baseada em CSS e paletas de cores premium definidas via modelo cromático **OKLCH**.
- **Zustand 5**: Biblioteca leve e robusta para gerenciamento de estado global e persistência local (usada para armazenar preferências do usuário como o tema escuro e colapso da sidebar).
- **TanStack React Query v5**: Gerenciador de estado assíncrono para cache de requisições, mutações e sincronização de dados com a API.
- **React Router DOM v7**: Roteamento dinâmico no navegador com suporte a guards de autenticação (rotas públicas/privadas).
- **React Hook Form & Zod**: Controle de formulários robusto com validação baseada em esquemas tipados.
- **Lucide React**: Biblioteca rica de ícones vetoriais modernos.

### Backend (API)
- **Node.js**: Ambiente de execução para JavaScript do lado do servidor.
- **Express**: Framework minimalista para criação de rotas HTTP e gerenciamento de middlewares.
- **JSON Database**: Sistema leve de persistência local construído em cima de um arquivo JSON (`server/db.json`) auxiliado pelo wrapper de operações assíncronas `server/database.js`.
- **JWT (JSON Web Token)**: Implementação de autenticação stateless baseada em token de acesso temporário (`accessToken` em memória) e token de atualização seguro (`refreshToken` persistido em cookie httpOnly).
- **CORS & Cookie-Parser**: Middlewares para tratamento de requisições cruzadas e gerenciamento de cabeçalhos de cookies.

---

## 📁 Estrutura de Pastas do Projeto

O projeto é separado em **Frontend** (diretório raiz) e **Backend** (subdiretório `server/`). A árvore de diretórios principal é organizada da seguinte forma:

```bash
revisa-aula/
├── dist/                   # Build de produção gerado pelo Vite
├── public/                 # Assets públicos acessíveis estaticamente
├── server/                 # Backend Node.js + Express
│   ├── authMiddleware.js   # Middleware de validação de token JWT
│   ├── database.js         # Utilitário de persistência no db.json
│   ├── db.json             # Nosso banco de dados em arquivo JSON
│   ├── index.js            # Arquivo principal de inicialização da API
│   ├── package.json        # Dependências e scripts do servidor Express
│   └── routes.js           # Definição dos endpoints da API (Auth, Cadernos, Folhas, Cards)
└── src/                    # Frontend React + TypeScript
    ├── assets/             # Arquivos de imagens, logos, etc.
    ├── components/         # Componentes compartilhados da aplicação
    │   ├── layout/         # Componentes estruturais de layout (Sidebar, AppLayout)
    │   └── ui/             # Componentes base e reutilizáveis (Button, Card, Input, Modal)
    ├── core/               # Arquivos de infraestrutura geral (cliente HTTP, etc.)
    ├── hooks/              # Custom React Hooks globais
    ├── modules/            # Funcionalidades e regras de negócio separadas por módulos
    │   ├── auth/           # Login, Cadastro, autenticação e sessão do usuário
    │   ├── leaves/         # Editor de notas (Folhas/Aulas) e integração de resumos/cards
    │   ├── notebooks/      # Dashboard e gerenciamento de cadernos acadêmicos
    │   └── study/          # Motor de estudo de flashcards (estatísticas, notas, SM-2)
    ├── routes/             # Configuração das rotas do React Router (PrivateRoute, PublicRoute)
    ├── store/              # Lojas globais do Zustand (ex: uiStore)
    ├── App.css             # Estilos auxiliares globais do App
    ├── App.tsx             # Componente raiz com provedores do React Query e Router
    ├── index.css           # CSS principal carregando o Tailwind CSS v4, tema OKLCH e variantes
    └── main.tsx            # Ponto de entrada que monta o app no DOM
```

---

## ⚙️ O que foi Desenvolvido até Agora

1. **Sistema de Autenticação Completo**:
   - Registro de novos usuários com seed de avatar gerado aleatoriamente (`Dicebear API`).
   - Login por e-mail e senha com persistência de sessão e autenticação de rotas.
   - Renovação silenciosa de tokens (`silent refresh`) baseada em Cookies seguros.

2. **Gerenciamento de Cadernos (Notebooks)**:
   - Visualização em grade (Dashboard) dos cadernos do estudante.
   - Criação e edição de cadernos com descrição e tags de cores customizadas.
   - Exclusão em cascata (deletar um caderno apaga automaticamente todas as suas folhas e flashcards correspondentes).

3. **Editor de Notas e Estudo Ativo (Leaves)**:
   - Editor focado na escrita de anotações e conteúdos textuais.
   - Criação inteligente de **Resumos automatizados** via simulação de IA.
   - Geração automática de **Flashcards** baseados no conteúdo anotado para reforço de memória.

4. **Algoritmo de Aprendizado Spaced Repetition (SuperMemo-2 / SM-2)**:
   - Motor de estudos com controle de cards agendados para o dia de hoje.
   - Tela interativa de revelação da resposta com avaliação da facilidade de lembrança (notas de 0 a 5).
   - Recálculo inteligente na API da data da próxima revisão com base no número de repetições, fator de facilidade (Ease Factor) e intervalo, impedindo a curva de esquecimento.

5. **Modo Escuro (Dark Mode) Integrado com Tailwind CSS v4**:
   - Chaveamento rápido de temas via Zustand (`studynotes-ui` no LocalStorage).
   - Estilização premium e harmoniosa nos modos claro e escuro, controlada na raiz pela classe `.dark` do Tailwind CSS.

6. **Otimização de Renderização e Performance do Editor**:
   - **Memoização estratégica**: Componentes do editor (`EditorToolbar`, `EditorBubbleMenu`, `AnnotationSidebar`) envolvidos em `React.memo` para evitar re-renders desnecessários.
   - **Estabilização de dependências**: Extensões do TipTap estabilizadas via `useMemo` e callback `onUpdate` via `useCallback`.
   - **Prevenção de loops de renderização**: Removido `setQueryData` do `onSuccess` da mutação de atualização para evitar que o cache do React Query dispare re-renders no editor durante o autosave.
   - **Flag `isApplyingRemote`**: Mecanismo robusto com fallback explícito para evitar race conditions entre conteúdo remoto e edição do usuário.
   - **Gerenciamento de estado de anotações**: Estado de popover de anotação alterado de objeto para string (`string | null`) com `useMemo` para estabilizar a referência e evitar disparar re-renders no `EditorToolbar`.
   - **Cleanup de event listeners**: Tratamento adequado de `requestAnimationFrame` pendente com cancelamento no unmount, e verificação de `editor.isDestroyed` antes de acessar o editor.
   - **Autosave otimizado**: Debounce de 1.5s, rastreamento do último estado salvo via ref para evitar saves duplicados.

7. **Anotações de Texto (Annotation System)**:
   - _Mark_ personalizado do TipTap para anotações, com suporte a `<span>` (atual) e `<mark>` (compatibilidade reversa).
   - **AnnotationSidebar**: Painel lateral que lista todas as anotações do texto com navegação por clique.
   - **HighlightPopover**: Seletor de cores de destaque (amarelo, dourado, turquesa, roxo).
   - **AnnotationPopover**: Popover para criação e edição de anotações com suporte a atalho de teclado (⌘Enter).

8. **Refatoração HMR e Estabilidade de Hot Reload (Vite 8 + React 19)**:
   - **Componentes nomeados nas rotas**: Substituído todo JSX inline nas propriedades `element` do `createBrowserRouter` por componentes nomeados explícitos (`LoginPage`, `RegisterPage`, `AppRoot`, `DashboardPage`, `NotebookDetailPage`, `LeafEditorPage`, `StudyPage`, `DefaultRedirect`, `CatchAllRedirect`), garantindo referências estáveis durante o Fast Refresh.
   - **`AppRoutes` como boundary público**: Criado componente `AppRoutes` que encapsula `<RouterProvider router={router} />`, eliminando a importação direta do `router` no `App.tsx` e isolando a instância do roteador como constante estática do módulo.
   - **`server.hmr.overlay: true`**: Configurado no `vite.config.ts` para exibir erros de HMR com overlay visual no navegador, facilitando o diagnóstico de falhas de atualização.
   - **Verificação antiloop**: Auditoria completa contra `window.location.reload()` em todo o código-fonte (0 ocorrências). Confirmado que `isApplyingRemote` no `EditorView.tsx` já utiliza `useRef` estável, e o `client.ts` já implementa fila de renovação de token sem redirecionamentos forçados.

---

## 🎯 Melhorias Planejadas & Próximos Passos

### 🔴 Críticas
- [ ] **Testes automatizados**: Ausência de testes unitários e de integração para o editor, hooks e serviços.
- [ ] **Validação de dados**: O `summaryMutation` usa `setQueryData` com tipagem `any` — substituir por tipo correto.
- [ ] **`staleTime` no `useLeafFlashcards`**: Adicionar `staleTime` para evitar refetch desnecessário a cada montagem do componente.

### 🟡 Melhorias
- [ ] **Estado de carregamento do editor**: Criar um Skeleton loader para o editor enquanto o conteúdo da folha é carregado.
- [ ] **Persistência de cursor**: Salvar e restaurar a posição do cursor após autosave.
- [ ] **Offline-first**: Implementar suporte a edição offline com sincronização ao reconectar.
- [ ] **Atalhos de teclado**: Adicionar tooltips com atalhos no bubble menu (já existe na toolbar).
- [ ] **Performance de listas de flashcards**: Virtualizar a lista de flashcards com `react-window` para coleções grandes.

### 🟢 Desejáveis
- [ ] **Exportar conteúdo**: Opções para exportar folhas em Markdown, PDF ou TXT.
- [ ] **Múltiplos temas**: Além do claro/escuro, oferecer temas de cores alternativos.
- [ ] **Histórico de versões**: Versionamento do conteúdo das folhas para permitir desfazer alterações salvas.
- [ ] **Compartilhamento**: Compartilhar folhas ou cadernos com outros usuários.
- [ ] **Suporte a imagens**: Upload e incorporação de imagens no editor.

---

## 🚀 Como Executar o Projeto

Para executar o projeto localmente, certifique-se de ter o **Node.js** instalado em sua máquina. Recomendamos o uso de um gerenciador como o **NVM** para selecionar a versão do Node desejada.

### 1. Inicializando a API Backend 🖥️

1. No terminal, navegue até a pasta do servidor:
   ```bash
   cd server
   ```
2. Instale as dependências da API:
   ```bash
   npm install
   ```
3. Execute o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   *O backend estará rodando em: `http://localhost:3000/api`*

---

### 2. Inicializando o Frontend (Vite + React) 🌐

1. Em um segundo terminal (no diretório raiz do projeto), instale as dependências:
   ```bash
   npm install
   ```
2. Inicie o servidor local do Vite:
   ```bash
   npm run dev
   ```
   *O frontend estará disponível em: `http://localhost:5173/`*

---

## 🌙 Correção e Funcionamento do Modo Escuro

Na versão v4 do **Tailwind CSS**, a configuração padrão do modo escuro é baseada na media query de preferência do sistema operacional (`prefers-color-scheme`). Para que o chaveamento por classe (injetando `.dark` na tag `<html>` ou `<body>`) funcione de maneira correta no Tailwind v4, é necessário declarar a diretiva de variante customizada diretamente no arquivo CSS de entrada.

A correção foi feita no arquivo [`src/index.css`](file:///home/guilherme/Documentos/Projetos/revisa-aula/src/index.css) adicionando a seguinte diretiva após o carregamento do Tailwind:

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));
```

Dessa forma, a classe `.dark` manipulada pelo Zustand no `uiStore.ts` e pelo React no `AppLayout.tsx` passa a ativar as classes utilitárias prefixadas com `dark:` (ex: `dark:bg-dark-900`, `dark:text-dark-50`) em toda a árvore de componentes da aplicação.
