-- =====================================================
-- AI Journal RAG — Database Schema
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ─────────────────────────────────────────────────
-- Users table
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        UNIQUE NOT NULL,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────
-- Notes table (journal entries + embeddings)
-- Dimension 1536 matches text-embedding-3-small (OpenAI)
-- and gemini-embedding-001 with outputDimensionality=1536.
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL,
  embedding  VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- HNSW index for fast approximate nearest-neighbour search
CREATE INDEX IF NOT EXISTS notes_embedding_hnsw
  ON notes USING hnsw (embedding vector_cosine_ops);

-- Standard index for efficient user-scoped queries
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON notes (user_id);

-- ─────────────────────────────────────────────────
-- Similarity search function (user-scoped)
-- Returns top-k notes for a given user and query vector.
-- ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION match_notes(
  query_embedding  VECTOR(1536),
  match_user_id    UUID,
  match_count      INT DEFAULT 5
)
RETURNS TABLE (
  id         UUID,
  content    TEXT,
  created_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    n.id,
    n.content,
    n.created_at,
    1 - (n.embedding <=> query_embedding) AS similarity
  FROM notes n
  WHERE n.user_id = match_user_id
    AND n.embedding IS NOT NULL
  ORDER BY n.embedding <=> query_embedding
  LIMIT match_count;
$$;
