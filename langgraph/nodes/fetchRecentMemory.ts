import { fetchRecentConversationTurns } from '@/lib/rag/vector-store';
import type { GraphState } from '@/langgraph/graph';

/**
 * Node: fetchRecentMemory
 *
 * Retrieves the last 3–5 conversation turns from `conversation_memory_chunks`
 * using a direct MongoDB sort + limit query — NOT vector search.
 *
 * This gives the question generator a chronological window of recent dialogue
 * for conversational continuity.
 *
 * Updates state.recentTurns.
 */
export async function fetchRecentMemory(state: GraphState): Promise<Partial<GraphState>> {
  if (!state.userId || !state.sessionId) {
    return { recentTurns: [] };
  }

  try {
    const recentTurns = await fetchRecentConversationTurns(
      state.userId,
      state.sessionId,
      5, // fetch last 5 turns
    );
    return { recentTurns };
  } catch (err) {
    console.error('[RAG] fetchRecentMemory error:', err);
    return { recentTurns: [] };
  }
}
