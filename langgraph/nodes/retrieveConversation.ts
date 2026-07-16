/**
 * ============================================================
 * FILE: langgraph/nodes/retrieveConversation.ts
 * PURPOSE: LangGraph Node 2 — retrieve similar prior Q&A turns
 * ============================================================
 *
 * WHAT IT DOES:
 * Embeds the current Q&A pair combined ("Q: ...\\nA: ...") and
 * searches `conversation_memory_chunks` for prior turns with
 * similar content.
 *
 * WHY EMBED Q+A TOGETHER?
 * Each stored document was embedded from "Q: <q>\nA: <a>".
 * The search query must use the same format to match correctly.
 *
 * SCOPE: Scoped to userId AND sessionId — only retrieves turns
 * from the CURRENT session, not other sessions the user had.
 *
 * PURPOSE: Helps the questionGenerator avoid repeating questions
 * that were already asked earlier in the current session.
 *
 * ERROR HANDLING: Errors are caught. Returns [] on failure.
 * ============================================================
 */

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
  // Build the query string in the same format as the stored embeddings ("Q: ...\nA: ...")
  // If no answer yet (first turn), fall back to just the question text
  const query = state.latestAnswer
    ? `Q: ${state.currentQuestion}\nA: ${state.latestAnswer}`
    : state.currentQuestion || '';

  // Skip if nothing to search or missing required scoping identifiers
  if (!query.trim() || !state.userId || !state.sessionId) {
    return { similarConversationTurns: [] };
  }

  try {
    // Embed the combined Q+A query to match the stored embedding format
    const queryEmbedding = await embedQuery(query);

    // Perform Atlas Vector Search scoped to this session — return top 3 similar turns
    const similarConversationTurns = await searchConversationMemory(
      state.userId,
      state.sessionId,
      queryEmbedding,
      3,
    );
    return { similarConversationTurns };
  } catch (err) {
    // Log but never crash the pipeline
    console.error('[RAG] retrieveConversation error:', err);
    return { similarConversationTurns: [] };
  }
}
