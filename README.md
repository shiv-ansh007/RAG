# AI Journal — RAG MVP

A full-stack private AI journal application where authenticated users can write journal entries and ask an AI assistant questions grounded **strictly in their own** historical entries.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│              Frontend (React + Vite)                      │
│  Auth UI | Journal UI | Chat UI                          │
└─────────────────────┬────────────────────────────────────┘
                      │ REST API
┌─────────────────────▼────────────────────────────────────┐
│           Backend (Node.js + Express + TypeScript)        │
│  POST /auth/register   POST /auth/login                  │
│  POST /api/notes       GET  /api/notes                   │
│  POST /api/chat                                          │
└─────────┬─────────────────────┬───────────────────────────┘
          │                     │
┌─────────▼──────────┐ ┌────────▼──────────────────────────┐
│ Supabase           │ │ LLM Abstraction Layer              │
│ PostgreSQL+pgvector│ │ OpenRouter adapter (default)       │
│                    │ │ Ollama adapter (local fallback)    │
└────────────────────┘ └───────────────────────────────────┘
```

### LLM Abstraction

All LLM calls go through a single interface (`generateAnswer(messages, options)`). The provider is selected at startup using the `LLM_PROVIDER` environment variable:

| `LLM_PROVIDER` | Adapter | Config keys needed |
|---|---|---|
| `openrouter` (default) | `OpenRouterAdapter` | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` |
| `ollama` | `OllamaAdapter` | `OLLAMA_BASE_URL`, `OLLAMA_MODEL` |

**Switching providers requires only an env var change and restart — zero code changes.**

### Multi-Tenancy

- Every request is authenticated via JWT. The `user_id` is always extracted from the **verified token**, never from the request body.
- All database reads/writes include `WHERE user_id = <authenticated_id>`.
- The Supabase vector search function (`match_notes`) takes `match_user_id` as a required parameter — cross-user retrieval is impossible by design.

---

## Local Setup

### Prerequisites

- Node.js 18+
- A Supabase project (free tier works)
- OpenRouter API key OR Ollama running locally

### 1. Run the database migration

In your Supabase project → SQL Editor, paste and run:

```
supabase/migrations/001_init.sql
```

> **Note:** The schema uses `VECTOR(1536)` for OpenAI embeddings.  
> If you use Ollama `nomic-embed-text` (768 dims), change `1536` → `768` before running.

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
# Edit .env with your real credentials
```

Key variables:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key

JWT_SECRET=a-long-random-secret

# Embedding
EMBEDDING_PROVIDER=gemini           
GEMINI_API_KEY=sk-...              

# LLM
LLM_PROVIDER=openrouter            # or 'ollama'
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=openai/gpt-4o-mini
```

### 3. Start the backend

```bash
cd backend
npm install
npm run dev
```

Backend starts at `http://localhost:3001`.

### 4. Configure and start the frontend

```bash
cd frontend
cp .env.example .env   # VITE_API_URL=http://localhost:3001
npm install
npm run dev
```

Frontend starts at `http://localhost:5173`.

### 5. Run tests

```bash
cd backend
npm test
```

---

## API Contract

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | ✗ | Register a new user |
| POST | `/auth/login` | ✗ | Login and receive JWT |
| POST | `/api/notes` | ✓ | Create note + generate embedding |
| GET | `/api/notes` | ✓ | List current user's notes |
| POST | `/api/chat` | ✓ | RAG query → grounded AI answer |
| GET | `/health` | ✗ | Server health check |

---
 

---

## Security

- Passwords hashed with bcrypt (cost factor 12)
- JWTs signed with HS256, expire in 7 days
- All API keys stored in `.env` only — never in source code
- Input validated with Zod on all endpoints
- Logs never print secrets, passwords, or authorization headers
- `.gitignore` excludes all `.env` files
