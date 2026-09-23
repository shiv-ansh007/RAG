import { supabase } from '../db/supabase';
import { generateEmbedding } from './embedding';
import { getLLMProvider } from './llm/factory';
import { LLMMessage } from './llm/interface';
import { config } from '../config';

export interface RetrievedNote {
  id: string;
  content: string;
  created_at: string;
  similarity: number;
}

export interface RAGResult {
  answer: string;
  sources: RetrievedNote[];
}

/**
 * Full RAG pipeline:
 * 1. Embed the user question
 * 2. Search the vector store, filtered strictly by user_id
 * 3. Build a context-rich prompt
 * 4. Call the configured LLM
 * 5. Return the answer and source note metadata
 */
export async function runRAGPipeline(
  question: string,
  userId: string
): Promise<RAGResult> {
  console.log(`[rag] question received for user ${userId}`);

  // ── Step 1: Embed the question ──────────────────────────────────────────
  console.log('[rag] generating embedding for question...');
  const queryEmbedding = await generateEmbedding(question);
  console.log(`[rag] embedding generated (${queryEmbedding.length} dims)`);

  // ── Step 2: Similarity search with strict user_id filter ────────────────
  console.log('[rag] starting vector similarity search...');
  const { data: rawNotes, error } = await supabase.rpc('match_notes', {
    query_embedding: queryEmbedding,
    match_user_id: userId,
    match_count: config.RAG_TOP_K,
  });

  if (error) {
    console.error('[rag] vector search error:', error.message);
    throw new Error('Vector search failed');
  }

  const notes: RetrievedNote[] = rawNotes ?? [];
  console.log(`[rag] retrieved ${notes.length} candidate notes for user ${userId}`);

  if (notes.length > 0) {
    const ids = notes.map((n) => n.id).join(', ');
    console.log(`[rag] source note IDs: ${ids}`);
  }

  // ── Step 3: Build the prompt ────────────────────────────────────────────
  const contextBlock =
    notes.length > 0
      ? notes
          .map(
            (n, i) =>
              `[Note ${i + 1} — ${new Date(n.created_at).toLocaleDateString()}]\n${n.content}`
          )
          .join('\n\n')
      : 'No relevant journal entries found.';

  const systemPrompt = `You are a personal AI assistant that helps users reflect on their journal entries.
You must answer ONLY based on the journal context provided below.
If the context does not contain enough information to answer the question, say so clearly.
Do not make up information or use knowledge outside of the provided context.

Journal context:
${contextBlock}`;

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: question },
  ];

  // ── Step 4: Invoke the LLM through the abstraction layer ────────────────
  const provider = getLLMProvider();
  console.log(`[rag] invoking LLM provider: ${config.LLM_PROVIDER}`);

  const answer = await provider.generateAnswer(messages);
  console.log('[rag] response generated successfully');

  return { answer, sources: notes };
}
