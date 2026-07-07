# Revisa Aula 🚀

Plataforma inteligente para gerenciamento de estudos, criação de resumos e flashcards com repetição espaçada.

---

## 📖 Visão Geral do Projeto

O **Revisa Aula** é um aplicativo completo voltado para estudantes que desejam organizar seus cadernos acadêmicos, criar notas de aulas (chamadas de **Folhas / Leaves**), gerar resumos inteligentes e criar flashcards para revisar o conteúdo utilizando repetição espaçada (algoritmo SM-2).

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 19**: Biblioteca moderna para construção de interfaces de usuário.
- **Vite 8**: Ferramenta de build rápida e moderna.
- **TypeScript**: Superset de JavaScript com tipagem estática.
- **Tailwind CSS v4**: Engine de estilização de alta performance com tema OKLCH.
- **Zustand 5**: Gerenciamento de estado global com persistência.
- **TanStack React Query v5**: Gerenciador de estado assíncrono para cache de requisições.
- **React Router DOM v7**: Roteamento dinâmico com guards de autenticação.
- **React Hook Form & Zod**: Formulários com validação tipada.
- **TipTap**: Editor de rich text para anotações.
- **Lucide React**: Ícones vetoriais modernos.

### Backend (NestJS)
- **NestJS 11**: Framework Node.js progressivo com injeção de dependência.
- **TypeScript**: Código 100% tipado.
- **Prisma ORM 7**: ORM moderno com driver adapter LibSQL para SQLite.
- **SQLite**: Banco de dados leve e embutido (arquivo `dev.db`).
- **Passport JWT**: Autenticação stateless com access token + refresh token em cookie HttpOnly.
- **class-validator + class-transformer**: Validação de DTOs por decorators.
- **@nestjs/config**: Gerenciamento de variáveis de ambiente.

---

## 📁 Estrutura de Pastas

```
revisa-aula/
├── dist/                          # Build de produção (Vite)
├── public/                        # Assets públicos
├── server/                        # Backend NestJS + Prisma
│   ├── src/
│   │   ├── main.ts                # Bootstrap NestJS
│   │   ├── app.module.ts          # Root module
│   │   ├── app.controller.ts      # Health check
│   │   ├── prisma/                # PrismaService (SQLite)
│   │   ├── common/                # Guards, decorators, filters
│   │   ├── auth/                  # Autenticação (JWT Passport)
│   │   ├── notebooks/             # CRUD cadernos
│   │   ├── leaves/                # CRUD folhas + IA mock
│   │   ├── flashcards/            # CRUD flashcards + SM-2
│   │   └── study/                 # Sessões + estatísticas
│   ├── prisma/
│   │   ├── schema.prisma          # Modelos do banco
│   │   ├── seed.ts                # Migração db.json → SQLite
│   │   └── migrations/            # Migrações Prisma
│   ├── prisma.config.ts           # Config Prisma v7
│   ├── dev.db                     # Banco SQLite
│   ├── .env                       # Variáveis de ambiente
│   └── package.json               # Dependências
├── src/                           # Frontend React
│   ├── components/                # Componentes reutilizáveis
│   ├── core/                      # Cliente HTTP (axios)
│   ├── modules/                   # Módulos da aplicação
│   │   ├── auth/                  # Login, registro, sessão
│   │   ├── notebooks/             # Dashboard + cadernos
│   │   ├── leaves/                # Editor TipTap + anotações
│   │   └── study/                 # Flashcards + SM-2 + estatísticas
│   ├── routes/                    # React Router
│   ├── store/                     # Zustand stores
│   ├── App.tsx                    # Componente raiz
│   └── main.tsx                   # Entry point
├── .env                           # VITE_API_URL
├── AGENTS.md                      # Documentação técnica detalhada
└── package.json                   # Dependências frontend
```

---

## ⚙️ Funcionalidades Implementadas

1. **Autenticação Completa (JWT + Refresh Token)**
   - Registro com avatar automático (Dicebear API)
   - Login com sessão persistente
   - Renovação silenciosa de tokens via cookie HttpOnly
   - Rotas públicas/privadas

2. **Gerenciamento de Cadernos (Notebooks)**
   - Dashboard em grid com cores de identificação
   - CRUD completo com cascade delete
   - Contagem automática de folhas

3. **Editor de Notas (Leaves) com TipTap**
   - Editor rich text com autosave (debounce 1.5s)
   - Anotações de texto com destaque colorido
   - Geração de resumo por IA (mockada)
   - Geração automática de flashcards

4. **Algoritmo SM-2 (Spaced Repetition)**
   - Revisão com scores 0-5
   - Cálculo automático do próximo intervalo (cap 365 dias)
   - Sessão de estudo persistente via API

5. **Estatísticas de Progresso**
   - Total de cards, revisados hoje, a revisar
   - Taxa de acerto com anel SVG
   - Breakdown por caderno

6. **Modo Escuro (Dark Mode)**
   - Chaveamento via Zustand + Tailwind v4

7. **Sub-folhas com Reordenação Drag & Drop**
   - Seção de sub-folhas colapsável no editor (inicia fechada)
   - Reordenação via drag & drop com `@dnd-kit`
   - Drag handle visual (`GripVertical`) nos cards
   - Update otimista no cache + rollback automático em caso de erro

8. **Scripts de Gerenciamento (start.sh / stop.sh)**
   - `./start.sh` — inicia backend + frontend em modo persistente (setsid)
   - `./start.sh --status` — verifica se os serviços estão rodando
   - `./stop.sh` — encerra ambos os serviços
   - Logs separados para cada serviço

---

## 🚀 Como Executar

### 1. Backend (NestJS)

```bash
cd server
npm install
npm run dev
```

O servidor estará em: **http://localhost:3000**

### 2. Frontend (Vite + React)

```bash
# Na raiz do projeto
npm install
npm run dev
```

O frontend estará em: **http://localhost:5173**

### 3. Migrar dados do db.json (se necessário)

Caso exista um `db.json` com dados do sistema anterior:

```bash
cd server
npx tsx prisma/seed.ts
```

---

## 📋 Scripts Disponíveis

### Backend (`server/package.json`)
| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Dev server com hot-reload (ts-node-dev) |
| `npm run build` | Compilar TypeScript (nest build) |
| `npm start` | Produção |
| `npm test` | Testes unitários (Jest) |

### Frontend (`package.json` raiz)
| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Dev server Vite |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |

### Scripts de Gerenciamento (raiz do projeto)
| Comando | Descrição |
|---------|-----------|
| `./start.sh` | Inicia backend (3000) + frontend (5173) |
| `./start.sh --backend` | Apenas backend |
| `./start.sh --frontend` | Apenas frontend |
| `./start.sh --status` | Mostra status dos serviços |
| `./stop.sh` | Encerra ambos os serviços |
| `./stop.sh --force` | Força kill -9 se necessário |

---

## 🧪 Testes

```bash
# Backend
cd server
npm test                # Testes unitários
npm run test:e2e        # Testes E2E

# Frontend
npm test
```
