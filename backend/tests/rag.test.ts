import request from 'supertest';
import { app } from '../src/index';
import { supabase } from '../src/db/supabase';
import { resetLLMProvider } from '../src/services/llm/factory';

async function registerAndLogin(email: string, password: string): Promise<string> {
  await request(app).post('/auth/register').send({ email, password });
  const res = await request(app).post('/auth/login').send({ email, password });
  return res.body.token as string;
}

async function deleteUserByEmail(email: string) {
  await supabase.from('users').delete().eq('email', email);
}

jest.setTimeout(30000);

describe('RAG Pipeline', () => {
  const email = `rag_test_${Date.now()}@example.com`;
  const password = 'RagTest123!';
  let token: string;

  beforeAll(async () => {
    token = await registerAndLogin(email, password);

    // Seed notes with known facts
    await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Today I adopted a golden retriever puppy named Biscuit.' });

    await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'I visited Paris last summer and saw the Eiffel Tower at night.' });
  });

  afterAll(async () => {
    await deleteUserByEmail(email);
  });

  it('should return a grounded answer about the dog', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ question: "What is the name of my dog?" });

    expect(res.status).toBe(200);
    expect(res.body.answer).toMatch(/Biscuit/i);
    expect(res.body.sources.length).toBeGreaterThan(0);
  });

  it('should return sources with note metadata', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ question: 'Tell me about my travel experiences.' });

    expect(res.status).toBe(200);
    expect(res.body.sources).toBeInstanceOf(Array);
    res.body.sources.forEach((s: { id: string; created_at: string; similarity: number }) => {
      expect(s.id).toBeDefined();
      expect(s.created_at).toBeDefined();
      expect(typeof s.similarity).toBe('number');
    });
  });

  it('should reject empty questions', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ question: '' });

    expect(res.status).toBe(400);
  });

  it('should reject empty notes', async () => {
    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '' });

    expect(res.status).toBe(400);
  });
});

describe('LLM Provider Switching', () => {
  it('getLLMProvider uses the provider set in LLM_PROVIDER env var', async () => {
    resetLLMProvider();
    const original = process.env.LLM_PROVIDER;

    process.env.LLM_PROVIDER = 'ollama';
    const { getLLMProvider } = await import('../src/services/llm/factory');
    resetLLMProvider();

    // Re-import with the new env value
    process.env.LLM_PROVIDER = 'openrouter';
    const provider = getLLMProvider();
    expect(provider).toBeDefined();
    expect(provider.generateAnswer).toBeInstanceOf(Function);

    // Restore
    process.env.LLM_PROVIDER = original;
    resetLLMProvider();
  });
});
