import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { runRAGPipeline } from '../services/rag';

const router = Router();

router.use(requireAuth);

const chatSchema = z.object({
  question: z
    .string()
    .min(1, 'Question cannot be empty')
    .max(2_000, 'Question exceeds 2,000 characters'),
});

// POST /api/chat
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  // user_id is always taken from the verified JWT
  const userId = req.user!.userId;
  const { question } = parsed.data;

  try {
    const result = await runRAGPipeline(question, userId);
    res.json({
      answer: result.answer,
      sources: result.sources.map((s) => ({
        id: s.id,
        created_at: s.created_at,
        similarity: Math.round(s.similarity * 1000) / 1000,
      })),
    });
  } catch (err: unknown) {
    const message = (err as Error).message ?? 'RAG pipeline failed';
    console.error('[chat] error:', message);

    if (message.includes('OpenRouter error') || message.includes('Ollama')) {
      res.status(502).json({ error: `LLM provider error: ${message}` });
      return;
    }
    if (message.includes('Vector search')) {
      res.status(502).json({ error: 'Vector database error' });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
