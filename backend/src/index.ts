import express from 'express';
import cors from 'cors';
import { config } from './config';
import authRouter from './routes/auth';
import notesRouter from './routes/notes';
import chatRouter from './routes/chat';

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', provider: config.LLM_PROVIDER });
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/auth', authRouter);
app.use('/api/notes', notesRouter);
app.use('/api/chat', chatRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Start server ──────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(config.PORT, () => {
    console.log(`✅ AI Journal backend running on http://localhost:${config.PORT}`);
    console.log(`   LLM provider : ${config.LLM_PROVIDER}`);
    console.log(`   Embedding    : ${config.EMBEDDING_PROVIDER} / ${config.EMBEDDING_MODEL}`);
    console.log(`   Environment  : ${config.NODE_ENV}`);
  });
}

export { app };
