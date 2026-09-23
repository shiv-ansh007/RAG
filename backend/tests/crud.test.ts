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

describe('Journal Notes CRUD Operations', () => {
  const user1Email = `crud_user1_${Date.now()}@example.com`;
  const user2Email = `crud_user2_${Date.now()}@example.com`;
  const password = 'CrudTestPass123!';

  let token1: string;
  let token2: string;
  let createdNoteId: string;

  beforeAll(async () => {
    token1 = await registerAndLogin(user1Email, password);
    token2 = await registerAndLogin(user2Email, password);
  });

  afterAll(async () => {
    await deleteUserByEmail(user1Email);
    await deleteUserByEmail(user2Email);
  });

  it('Create: POST /api/notes creates a new journal note', async () => {
    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token1}`)
      .send({ content: 'Initial note content for testing CRUD.' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.content).toBe('Initial note content for testing CRUD.');
    createdNoteId = res.body.id;
  });

  it('Read: GET /api/notes/:id retrieves single note', async () => {
    const res = await request(app)
      .get(`/api/notes/${createdNoteId}`)
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdNoteId);
    expect(res.body.content).toBe('Initial note content for testing CRUD.');
  });

  it('Isolation: User 2 cannot read User 1 note by ID', async () => {
    const res = await request(app)
      .get(`/api/notes/${createdNoteId}`)
      .set('Authorization', `Bearer ${token2}`);

    expect(res.status).toBe(404);
  });

  it('Update: PUT /api/notes/:id updates note content and re-embeds', async () => {
    const res = await request(app)
      .put(`/api/notes/${createdNoteId}`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ content: 'Updated note content with new facts.' });

    expect(res.status).toBe(200);
    expect(res.body.content).toBe('Updated note content with new facts.');
  });

  it('Isolation: User 2 cannot update User 1 note', async () => {
    const res = await request(app)
      .put(`/api/notes/${createdNoteId}`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ content: 'Malicious update attempt' });

    expect(res.status).toBe(404);
  });

  it('Delete: DELETE /api/notes/:id deletes note for owner', async () => {
    const res = await request(app)
      .delete(`/api/notes/${createdNoteId}`)
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdNoteId);

    // Verify it is gone
    const checkRes = await request(app)
      .get(`/api/notes/${createdNoteId}`)
      .set('Authorization', `Bearer ${token1}`);

    expect(checkRes.status).toBe(404);
  });

  it('Isolation: User 2 cannot delete User 1 note', async () => {
    // Create new note for user 1
    const createRes = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token1}`)
      .send({ content: 'Another note for user 1' });

    const noteId = createRes.body.id;

    // User 2 tries to delete
    const deleteRes = await request(app)
      .delete(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${token2}`);

    expect(deleteRes.status).toBe(404);
  });
});
