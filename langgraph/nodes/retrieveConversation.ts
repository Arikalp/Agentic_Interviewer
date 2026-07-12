import { embedQuery } from '@/lib/rag/embedder';
import { searchConversationMemory } from '@/lib/rag/vector-store';
import type { GraphState } from '@/langgraph/graph';

/**
 * Node: retrieveConversation
 *
 * Searches `conversation_memory_chunks` for the most semantically similar
 * prior Q&A turns to the current question/answer pair.
 *
 * Filters by both userId AND sessionId so retrieval is scoped to the
 * current session only.
 *
 * Updates state.similarConversationTurns.
 */
export async function retrieveConversation(state: GraphState): Promise<Partial<GraphState>> {
  const query = state.latestAnswer
    ? `Q: ${state.currentQuestion}\nA: ${state.latestAnswer}`
    : state.currentQuestion || '';

  if (!query.trim() || !state.userId || !state.sessionId) {
    return { similarConversationTurns: [] };
  }

  try {
    const queryEmbedding = await embedQuery(query);
    const similarConversationTurns = await searchConversationMemory(
      state.userId,
      state.sessionId,
      queryEmbedding,
      3,
    );
    return { similarConversationTurns };
  } catch (err) {
    console.error('[RAG] retrieveConversation error:', err);
    return { similarConversationTurns: [] };
  }
}
