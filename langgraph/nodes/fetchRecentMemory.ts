/**
 * ============================================================
 * FILE: langgraph/nodes/fetchRecentMemory.ts
 * PURPOSE: LangGraph Node 3 — fetch recent conversation turns
 * ============================================================
 *
 * WHAT IT DOES:
 * Fetches the last 5 conversation turns for the current session
 * using a direct MongoDB sort + limit query (NOT vector search).
 *
 * KEY DISTINCTION vs retrieveConversation (Node 2):
 *  - Node 2 finds turns that are SEMANTICALLY SIMILAR to the
 *    current question/answer (can be from any point in session).
 *  - Node 3 (this) finds the MOST RECENT turns in chronological
 *    order — giving the LLM conversational continuity.
 *
 * WHY BOTH?
 * Vector search = "what topics are relevant?"
 * Direct fetch   = "what was just discussed?"
 * Together they give the LLM both topical relevance AND
 * recent context for fluid, natural-sounding interviews.
 *
 * ERROR HANDLING: Errors are caught. Returns [] on failure.
 * ============================================================
 */

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
  // Cannot fetch without scoping identifiers
  if (!state.userId || !state.sessionId) {
    return { recentTurns: [] };
  }

  try {
    const recentTurns = await fetchRecentConversationTurns(
      state.userId,
      state.sessionId,
      5, // fetch last 5 turns — enough for conversational context without bloating the prompt
    );
    return { recentTurns };
  } catch (err) {
    // Log but never crash the pipeline
    console.error('[RAG] fetchRecentMemory error:', err);
    return { recentTurns: [] };
  }
}
