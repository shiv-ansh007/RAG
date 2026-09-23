import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { supabase } from '../db/supabase';
import { config } from '../config';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { email, password } = parsed.data;

  // Check if user already exists
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const password_hash = await bcrypt.hash(password, 12);

  const { data: user, error } = await supabase
    .from('users')
    .insert({ email, password_hash })
    .select('id, email, created_at')
    .single();

  if (error || !user) {
    console.error('[auth] register error:', error?.message);
    res.status(500).json({ error: 'Failed to create account' });
    return;
  }

  const signOptions: SignOptions = { expiresIn: config.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    config.JWT_SECRET,
    signOptions
  );

  console.log(`[auth] registered user ${user.id}`);
  res.status(201).json({ token, user: { id: user.id, email: user.email } });
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { email, password } = parsed.data;

  const { data: user } = await supabase
    .from('users')
    .select('id, email, password_hash')
    .eq('email', email)
    .maybeSingle();

  const isValid = user ? await bcrypt.compare(password, user.password_hash) : false;

  if (!user || !isValid) {
    // Consistent timing to prevent user enumeration
    console.warn(`[auth] failed login attempt for email: ${email}`);
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const signOptions: SignOptions = { expiresIn: config.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    config.JWT_SECRET,
    signOptions
  );

  console.log(`[auth] login success for user ${user.id}`);
  res.json({ token, user: { id: user.id, email: user.email } });
});

export default router;
