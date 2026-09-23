import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { supabase } from '../db/supabase';
import { generateEmbedding } from '../services/embedding';

const router = Router();

// All notes routes require authentication
router.use(requireAuth);

const noteSchema = z.object({
  content: z
    .string()
    .min(1, 'Note content cannot be empty')
    .max(10_000, 'Note content exceeds 10,000 characters'),
});

// POST /api/notes — Create a note and store its embedding
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  // user_id comes ONLY from the verified JWT — never from the request body
  const userId = req.user!.userId;
  const { content } = parsed.data;

  let embedding: number[];
  try {
    embedding = await generateEmbedding(content);
    console.log(`[notes] embedding generated for user ${userId} (${embedding.length} dims)`);
  } catch (err) {
    console.error('[notes] embedding error:', err);
    res.status(502).json({ error: 'Failed to generate embedding' });
    return;
  }

  const { data: note, error } = await supabase
    .from('notes')
    .insert({
      user_id: userId,
      content,
      embedding: JSON.stringify(embedding),
    })
    .select('id, content, created_at')
    .single();

  if (error || !note) {
    console.error('[notes] insert error:', error?.message);
    res.status(500).json({ error: 'Failed to save note' });
    return;
  }

  console.log(`[notes] created note ${note.id} for user ${userId}`);
  res.status(201).json(note);
});

// GET /api/notes — List authenticated user's notes
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;

  const { data: notes, error } = await supabase
    .from('notes')
    .select('id, content, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[notes] list error:', error.message);
    res.status(500).json({ error: 'Failed to fetch notes' });
    return;
  }

  res.json(notes ?? []);
});

// GET /api/notes/:id — Get a single note by ID (user-scoped)
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params;

  const { data: note, error } = await supabase
    .from('notes')
    .select('id, content, created_at')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error || !note) {
    res.status(404).json({ error: 'Note not found' });
    return;
  }

  res.json(note);
});

// PUT /api/notes/:id — Update a note and regenerate its embedding (user-scoped)
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const userId = req.user!.userId;
  const { id } = req.params;
  const { content } = parsed.data;

  // Check existence & ownership first
  const { data: existing } = await supabase
    .from('notes')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (!existing) {
    res.status(404).json({ error: 'Note not found or access denied' });
    return;
  }

  let embedding: number[];
  try {
    embedding = await generateEmbedding(content);
  } catch (err) {
    console.error('[notes] update embedding error:', err);
    res.status(502).json({ error: 'Failed to generate embedding for updated note' });
    return;
  }

  const { data: updated, error } = await supabase
    .from('notes')
    .update({
      content,
      embedding: JSON.stringify(embedding),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id, content, created_at')
    .single();

  if (error || !updated) {
    console.error('[notes] update error:', error?.message);
    res.status(500).json({ error: 'Failed to update note' });
    return;
  }

  console.log(`[notes] updated note ${id} for user ${userId}`);
  res.json(updated);
});

// DELETE /api/notes/:id — Delete a note (user-scoped)
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params;

  // Check ownership
  const { data: existing } = await supabase
    .from('notes')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (!existing) {
    res.status(404).json({ error: 'Note not found or access denied' });
    return;
  }

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('[notes] delete error:', error.message);
    res.status(500).json({ error: 'Failed to delete note' });
    return;
  }

  console.log(`[notes] deleted note ${id} for user ${userId}`);
  res.json({ message: 'Note deleted successfully', id });
});

export default router;
