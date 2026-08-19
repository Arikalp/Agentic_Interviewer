import { getMongoDb } from '@/lib/mongodb';
import type { ResumeChunk } from '@/models/ResumeChunk';
import type { ConversationMemory } from '@/models/ConversationMemory';
import type { RawResumeChunk } from '@/lib/rag/chunker';

// ---------------------------------------------------------------------------
// Collection names
// ---------------------------------------------------------------------------
const RESUME_CHUNKS_COLLECTION = 'resume_chunks';
const CONVERSATION_CHUNKS_COLLECTION = 'conversation_memory_chunks';

// ---------------------------------------------------------------------------
// Vector Search Index Names (must be created in Atlas UI)
// ---------------------------------------------------------------------------
const RESUME_VECTOR_INDEX = 'resume_vector_index';
const CONVERSATION_VECTOR_INDEX = 'conversation_vector_index';

// ---------------------------------------------------------------------------
// Resume chunks
// ---------------------------------------------------------------------------

/**
 * Upsert all resume chunks for a user.
 * Deletes any previously stored chunks for the userId first, then inserts
 * the new batch. This ensures stale chunks from a previous resume are removed.
 */
export async function upsertResumeChunks(
  userId: string,
  rawChunks: RawResumeChunk[],
  embeddings: number[][],
): Promise<void> {
  if (rawChunks.length === 0) return;

  const db = await getMongoDb();
  const collection = db.collection<ResumeChunk>(RESUME_CHUNKS_COLLECTION);

  // Remove old chunks for this user
  await collection.deleteMany({ userId });

  const now = new Date();
  const docs: ResumeChunk[] = rawChunks.map((chunk, i) => ({
    userId,
    section: chunk.section,
    text: chunk.text,
    chunkIndex: chunk.chunkIndex,
    embedding: embeddings[i],
    updatedAt: now,
  }));

  await collection.insertMany(docs);
}

/**
 * Search resume chunks for a given user using MongoDB Atlas Vector Search.
 * Returns the top-k most similar chunks.
 */
export async function searchResumeChunks(
  userId: string,
  queryEmbedding: number[],
  topK = 3,
): Promise<ResumeChunk[]> {
  const db = await getMongoDb();

  const results = await db
    .collection<ResumeChunk>(RESUME_CHUNKS_COLLECTION)
    .aggregate([
      {
        $vectorSearch: {
          index: RESUME_VECTOR_INDEX,
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: topK * 10,
          limit: topK,
          filter: { userId },
        },
      },
      {
        $project: {
          embedding: 0, // exclude large vector from response
          _id: 0,
        },
      },
    ])
    .toArray();

  return results as unknown as ResumeChunk[];
}

// ---------------------------------------------------------------------------
// Conversation memory
// ---------------------------------------------------------------------------

/**
 * Store a single conversation turn in the `conversation_memory_chunks` collection.
 * The embedding must be pre-generated from combinedText = "Q: ...\nA: ...".
 */
export async function storeConversationTurn(
  turn: Omit<ConversationMemory, '_id'>,
): Promise<void> {
  const db = await getMongoDb();
  await db
    .collection<ConversationMemory>(CONVERSATION_CHUNKS_COLLECTION)
    .insertOne(turn as ConversationMemory);
}

/**
 * Vector search over conversation memory for a specific session.
 * Returns the top-k most semantically similar prior Q&A turns.
 *
 * IMPORTANT: Filters by both userId and sessionId to scope retrieval
 * to the current session only.
 */
export async function searchConversationMemory(
  userId: string,
  sessionId: string,
  queryEmbedding: number[],
  topK = 3,
): Promise<ConversationMemory[]> {
  const db = await getMongoDb();

  const results = await db
    .collection<ConversationMemory>(CONVERSATION_CHUNKS_COLLECTION)
    .aggregate([
      {
        $vectorSearch: {
          index: CONVERSATION_VECTOR_INDEX,
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: topK * 10,
          limit: topK,
          filter: { userId, sessionId },
        },
      },
      {
        $project: {
          embedding: 0, // exclude large vector
          _id: 0,
        },
      },
    ])
    .toArray();

  return results as unknown as ConversationMemory[];
}

/**
 * Fetch the last N conversation turns for a session using a direct MongoDB
 * sort + limit query — NOT vector search.
 *
 * This is the "recent memory" retrieval. According to the architecture,
 * recent memory must always be fetched directly from MongoDB,
 * never via vector search.
 */
export async function fetchRecentConversationTurns(
  userId: string,
  sessionId: string,
  limit = 5,
): Promise<ConversationMemory[]> {
  const db = await getMongoDb();

  const results = await db
    .collection<ConversationMemory>(CONVERSATION_CHUNKS_COLLECTION)
    .find({ userId, sessionId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .project({ embedding: 0 })
    .toArray();

  // Reverse so chronological order is preserved (oldest first)
  return (results as unknown as ConversationMemory[]).reverse();
}
