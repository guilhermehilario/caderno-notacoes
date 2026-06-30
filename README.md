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
