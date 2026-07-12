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
