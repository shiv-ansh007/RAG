/// <reference types="vite/client" />

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

function getHeaders(token?: string | null): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  token: string;
  user: { id: string; email: string };
}

export async function apiRegister(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<AuthResponse>(res);
}

export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<AuthResponse>(res);
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export interface Note {
  id: string;
  content: string;
  created_at: string;
}

export async function apiCreateNote(content: string, token: string): Promise<Note> {
  const res = await fetch(`${BASE_URL}/api/notes`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ content }),
  });
  return handleResponse<Note>(res);
}

export async function apiGetNotes(token: string): Promise<Note[]> {
  const res = await fetch(`${BASE_URL}/api/notes`, {
    headers: getHeaders(token),
  });
  return handleResponse<Note[]>(res);
}

export async function apiUpdateNote(id: string, content: string, token: string): Promise<Note> {
  const res = await fetch(`${BASE_URL}/api/notes/${id}`, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify({ content }),
  });
  return handleResponse<Note>(res);
}

export async function apiDeleteNote(id: string, token: string): Promise<{ message: string; id: string }> {
  const res = await fetch(`${BASE_URL}/api/notes/${id}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  });
  return handleResponse<{ message: string; id: string }>(res);
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export interface ChatSource {
  id: string;
  created_at: string;
  similarity: number;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
}

export async function apiChat(question: string, token: string): Promise<ChatResponse> {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ question }),
  });
  return handleResponse<ChatResponse>(res);
}
