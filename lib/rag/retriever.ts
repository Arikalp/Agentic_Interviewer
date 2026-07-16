/**
 * ============================================================
 * FILE: lib/rag/retriever.ts
 * PURPOSE: Combined retrieval across all three RAG data sources
 * ============================================================
 *
 * This module provides `retrieveAll()` — a single function that
 * fetches all three types of context needed for the interview
 * question generator in parallel:
 *
 *  1. Resume chunks (vector search)
 *  2. Similar conversation turns (vector search)
 *  3. Recent conversation turns (direct MongoDB fetch)
 *
 * WHY PARALLEL?
 * All three fetches are independent. Running them with
 * `Promise.all()` reduces total latency to the slowest
 * operation instead of the sum of all three.
 *
 * SHARED EMBEDDING:
 * A single embedding is generated for the query and reused
 * across both vector searches. This avoids calling the embedding
 * model twice for the same input.
 *
 * NOTE: This module is an alternative to the LangGraph nodes
 * approach. It can be used for non-LangGraph code paths.
 * ============================================================
 */

import { embedQuery } from '@/lib/rag/embedder';
import {
  searchResumeChunks,
  searchConversationMemory,
  fetchRecentConversationTurns,
} from '@/lib/rag/vector-store';
import type { ResumeChunk } from '@/models/ResumeChunk';
import type { ConversationMemory } from '@/models/ConversationMemory';

/**
 * RetrievalResult
 * ---------------
 * The combined result of fetching all three RAG context sources.
 * Returned by `retrieveAll()` and consumed by the question generator.
 */
export interface RetrievalResult {
  /** Top-K resume chunks from vector search */
  resumeChunks: ResumeChunk[];
  /** Semantically similar prior Q&A turns from vector search */
  similarConversationTurns: ConversationMemory[];
  /** Last N conversation turns from direct MongoDB fetch */
  recentTurns: ConversationMemory[];
}

/**
 * retrieveAll (EXPORTED, ASYNC)
 * ------------------------------
 * Fetches all three memory sources in parallel for a given query.
 *
 * THREE DATA SOURCES:
 *  1. Resume chunks       — vector search over `resume_chunks`
 *  2. Similar conv turns  — vector search over `conversation_memory_chunks`
 *  3. Recent turns        — direct MongoDB fetch (last 3–5 turns), NO vector search
 *
 * HOW IT WORKS:
 *  1. Generate one 384-dim embedding for the query string.
 *  2. Run all three fetches concurrently using `Promise.all()`.
 *  3. Return the combined results.
 *
 * PERFORMANCE NOTE:
 * `Promise.all()` runs all three fetches in parallel. Total latency
 * equals the slowest fetch, not the sum of all three.
 *
 * @param userId        - Clerk userId
 * @param sessionId     - Current interview session ID
 * @param query         - The query to embed (typically latestAnswer or Q+A combined)
 * @param topKResume    - How many resume chunks to retrieve (default: 3)
 * @param topKConv      - How many similar conversation turns to retrieve (default: 3)
 * @param recentLimit   - How many recent turns to fetch directly (default: 5)
 */
export async function retrieveAll(
  userId: string,
  sessionId: string,
  query: string,
  topKResume = 3,
  topKConv = 3,
  recentLimit = 5,
): Promise<RetrievalResult> {
  // Step 1: Generate a single embedding for the query — reused across both vector searches
  // Generate a single embedding for the query — shared across resume + conv search
  const queryEmbedding = await embedQuery(query);

  // Step 2: Run all three fetches in parallel for minimum total latency
  // Run resume search, conversation vector search, and recent-memory fetch in parallel
  const [resumeChunks, similarConversationTurns, recentTurns] = await Promise.all([
    searchResumeChunks(userId, queryEmbedding, topKResume),
    searchConversationMemory(userId, sessionId, queryEmbedding, topKConv),
    fetchRecentConversationTurns(userId, sessionId, recentLimit),
  ]);

  return { resumeChunks, similarConversationTurns, recentTurns };
}
