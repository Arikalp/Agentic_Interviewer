/**
 * ============================================================
 * FILE: models/ConversationMemory.ts
 * PURPOSE: MongoDB document type for interview conversation turns
 * ============================================================
 *
 * Each time a candidate answers a question, a `ConversationMemory`
 * document is created and stored in the `conversation_memory_chunks`
 * MongoDB collection. This is the foundation of the long-term
 * memory system.
 *
 * EMBEDDING STRATEGY:
 * The question AND answer are embedded TOGETHER as a single string:
 *   "Q: <question>\nA: <answer>"
 *
 * This is intentional: embedding both together means a vector search
 * for "tell me about React" will surface turns where the answer
 * also discussed React — not just turns where the question mentioned it.
 *
 * RETRIEVAL:
 *  - `searchConversationMemory()` uses MongoDB Atlas Vector Search
 *    to find semantically similar prior turns.
 *  - `fetchRecentConversationTurns()` uses a simple sort+limit
 *    to get the most recent N turns chronologically.
 *
 * COLLECTION: `conversation_memory_chunks`
 * VECTOR INDEX: `conversation_vector_index` (Atlas UI)
 * ============================================================
 */

import type { ObjectId } from 'mongodb';

/**
 * A single conversation turn stored in `conversation_memory_chunks`.
 * Both the question AND answer are embedded together as `combinedText`
 * so vector search captures the full dialogue context.
 */
export interface ConversationMemory {
  _id?: ObjectId;

  /** Interview session identifier — scopes retrieval to the current session */
  sessionId: string;

  /** Clerk userId — used as a secondary filter */
  userId: string;

  /** The interview question that was asked */
  question: string;

  /** The candidate's verbatim answer */
  answer: string;

  /**
   * Combined text that is embedded.
   * Format: "Q: <question>\nA: <answer>"
   * IMPORTANT: Always embed Q+A together, never the answer alone.
   */
  combinedText: string;

  /** 384-dim BAAI/bge-small-en-v1.5 embedding of combinedText */
  embedding: number[];

  /** Turn index within the session for ordering */
  turnIndex: number;

  /** Timestamp of when this turn was stored */
  createdAt: Date;
}
