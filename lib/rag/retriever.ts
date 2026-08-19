import { embedQuery } from '@/lib/rag/embedder';
import {
  searchResumeChunks,
  searchConversationMemory,
  fetchRecentConversationTurns,
} from '@/lib/rag/vector-store';
import type { ResumeChunk } from '@/models/ResumeChunk';
import type { ConversationMemory } from '@/models/ConversationMemory';

/**
 * Result returned by the retriever for a single RAG lookup.
 */
export interface RetrievalResult {
  resumeChunks: ResumeChunk[];
  similarConversationTurns: ConversationMemory[];
  recentTurns: ConversationMemory[];
}

/**
 * Retrieve all three memory sources for a given query and session.
 *
 * 1. Resume chunks — vector search over `resume_chunks`
 * 2. Similar conversation turns — vector search over `conversation_memory_chunks`
 * 3. Recent turns — direct MongoDB fetch (last 3–5 turns), NO vector search
 *
 * @param userId        Clerk userId
 * @param sessionId     Current interview session ID
 * @param query         The query to embed (typically latestAnswer or latestAnswer + question)
 * @param topKResume    How many resume chunks to retrieve (default: 3)
 * @param topKConv      How many similar conversation turns to retrieve (default: 3)
 * @param recentLimit   How many recent turns to fetch directly (default: 5)
 */
export async function retrieveAll(
  userId: string,
  sessionId: string,
  query: string,
  topKResume = 3,
  topKConv = 3,
  recentLimit = 5,
): Promise<RetrievalResult> {
  // Generate a single embedding for the query — shared across resume + conv search
  const queryEmbedding = await embedQuery(query);

  // Run resume search, conversation vector search, and recent-memory fetch in parallel
  const [resumeChunks, similarConversationTurns, recentTurns] = await Promise.all([
    searchResumeChunks(userId, queryEmbedding, topKResume),
    searchConversationMemory(userId, sessionId, queryEmbedding, topKConv),
    fetchRecentConversationTurns(userId, sessionId, recentLimit),
  ]);

  return { resumeChunks, similarConversationTurns, recentTurns };
}
