import request from 'supertest';
import { app } from '../src/index';
import { supabase } from '../src/db/supabase';

async function registerAndLogin(email: string, password: string): Promise<string> {
  await request(app).post('/auth/register').send({ email, password });
  const res = await request(app).post('/auth/login').send({ email, password });
  return res.body.token as string;
}

async function deleteUserByEmail(email: string) {
  await supabase.from('users').delete().eq('email', email);
}

jest.setTimeout(30000);

describe('Multi-Tenancy Isolation', () => {
  const userAEmail = `isolation_a_${Date.now()}@example.com`;
  const userBEmail = `isolation_b_${Date.now()}@example.com`;
  const password = 'IsolationTest1!';
  let tokenA: string;
  let tokenB: string;
  let noteIdCreatedByA: string;

  beforeAll(async () => {
    tokenA = await registerAndLogin(userAEmail, password);
    tokenB = await registerAndLogin(userBEmail, password);
  });

  afterAll(async () => {
    await deleteUserByEmail(userAEmail);
    await deleteUserByEmail(userBEmail);
  });

  it('User A can create a note', async () => {
    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ content: 'User A private entry: my cat is named Whiskers.' });

    expect(res.status).toBe(201);
    noteIdCreatedByA = res.body.id;
    expect(noteIdCreatedByA).toBeDefined();
  });

  it('User B journal is empty (cannot see User A notes)', async () => {
    const res = await request(app)
      .get('/api/notes')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    const ids = (res.body as Array<{ id: string }>).map((n) => n.id);
    expect(ids).not.toContain(noteIdCreatedByA);
  });

  it('User A only sees their own notes', async () => {
    const res = await request(app)
      .get('/api/notes')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    const ids = (res.body as Array<{ id: string }>).map((n) => n.id);
    expect(ids).toContain(noteIdCreatedByA);
  });

  it('User B chat cannot retrieve User A notes via vector search', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ question: 'What is the name of the cat?' });

    // Either the answer indicates no relevant context, or sources are empty
    expect(res.status).toBe(200);
    const sources = (res.body.sources as Array<{ id: string }>) ?? [];
    const sourceIds = sources.map((s) => s.id);
    expect(sourceIds).not.toContain(noteIdCreatedByA);
  });
});
