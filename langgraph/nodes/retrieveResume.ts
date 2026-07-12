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
  const query = state.latestAnswer || state.currentQuestion || '';

  if (!query.trim() || !state.userId) {
    return { resumeChunks: [] };
  }

  try {
    const queryEmbedding = await embedQuery(query);
    const resumeChunks = await searchResumeChunks(state.userId, queryEmbedding, 3);
    return { resumeChunks };
  } catch (err) {
    console.error('[RAG] retrieveResume error:', err);
    return { resumeChunks: [] };
  }
}
