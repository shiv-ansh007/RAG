import request from 'supertest';
import { app } from '../src/index';
import { supabase } from '../src/db/supabase';

// Cleanup helper
async function deleteUserByEmail(email: string) {
  await supabase.from('users').delete().eq('email', email);
}

describe('Authentication', () => {
  const email = `test_auth_${Date.now()}@example.com`;
  const password = 'StrongPass123!';

  afterAll(async () => {
    await deleteUserByEmail(email);
  });

  it('should register a new user and return a JWT', async () => {
    const res = await request(app).post('/auth/register').send({ email, password });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(email);
  });

  it('should not allow duplicate registration', async () => {
    const res = await request(app).post('/auth/register').send({ email, password });
    expect(res.status).toBe(409);
  });

  it('should login with correct credentials', async () => {
    const res = await request(app).post('/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('should reject login with wrong password', async () => {
    const res = await request(app).post('/auth/login').send({ email, password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('should reject login with unknown email', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password });
    expect(res.status).toBe(401);
  });

  it('should reject requests with invalid token', async () => {
    const res = await request(app)
      .get('/api/notes')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });

  it('should reject requests with no token', async () => {
    const res = await request(app).get('/api/notes');
    expect(res.status).toBe(401);
  });

  it('should reject weak passwords on registration', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'weak@example.com', password: '123' });
    expect(res.status).toBe(400);
  });
});
