/**
 * ============================================================
 * FILE: langgraph/nodes/retrieveResume.ts
 * PURPOSE: LangGraph Node 1 — retrieve relevant resume chunks
 * ============================================================
 *
 * WHAT IT DOES:
 * Embeds the candidate's latest answer as a 384-dim vector, then
 * performs a MongoDB Atlas Vector Search over `resume_chunks` to
 * find the top-3 most semantically relevant resume sections.
 *
 * WHY EMBED THE ANSWER (NOT THE QUESTION)?
 * The answer reveals what the candidate actually discussed. If they
 * talked about "React hooks", embedding their answer surfaces the
 * resume's "Projects" or "Skills" sections mentioning React —
 * giving the LLM more relevant, grounded context.
 *
 * FALLBACK: If no answer exists (first turn), the current question
 * is used as the query instead.
 *
 * ERROR HANDLING: Errors are caught and logged. Returns [] on failure
 * so the pipeline continues without crashing.
 * ============================================================
 */

import { embedQuery } from '@/lib/rag/embedder';
import { searchResumeChunks } from '@/lib/rag/vector-store';
import type { GraphState } from '@/langgraph/graph';

/**
 * Node: retrieveResume
 *
 * Embeds the latest candidate answer and performs a vector search
 * over `resume_chunks` to find the most relevant resume sections.
 *
 * Updates state.resumeChunks with the top-K results.
 */
export async function retrieveResume(state: GraphState): Promise<Partial<GraphState>> {
  // Prefer the answer as query; fall back to the question on the very first turn
  const query = state.latestAnswer || state.currentQuestion || '';

  // Skip retrieval if there is nothing to embed or no userId to filter by
  if (!query.trim() || !state.userId) {
    return { resumeChunks: [] };
  }

  try {
    // Embed the query text into a 384-dim vector using the fastembed model
    const queryEmbedding = await embedQuery(query);

    // Perform Atlas Vector Search — return the top 3 most similar resume chunks
    const resumeChunks = await searchResumeChunks(state.userId, queryEmbedding, 3);
    return { resumeChunks };
  } catch (err) {
    // Log but never crash the pipeline — return empty so nodes downstream still run
    console.error('[RAG] retrieveResume error:', err);
    return { resumeChunks: [] };
  }
}
