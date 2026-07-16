/**
 * ============================================================
 * FILE: lib/rag/vector-store.ts
 * PURPOSE: MongoDB Atlas Vector Search operations for the RAG pipeline
 * ============================================================
 *
 * This module is the database layer for the RAG system. It provides
 * all CRUD and vector search operations against two MongoDB collections:
 *
 *  resume_chunks              : Resume text chunks with 384-dim embeddings
 *  conversation_memory_chunks : Interview Q&A turns with 384-dim embeddings
 *
 * HOW ATLAS VECTOR SEARCH WORKS:
 *  MongoDB Atlas Vector Search uses the `$vectorSearch` aggregation
 *  stage to find documents whose embedding vectors are most similar
 *  (cosine similarity) to a query vector. The search index must be
 *  created in the Atlas UI before these queries will work.
 *
 * REQUIRED ATLAS VECTOR INDEXES:
 *  Collection: resume_chunks
 *    Index name: resume_vector_index
 *    Field: embedding (384 dimensions, cosine similarity)
 *
 *  Collection: conversation_memory_chunks
 *    Index name: conversation_vector_index
 *    Field: embedding (384 dimensions, cosine similarity)
 *
 * numCandidates:
 *  Set to topK * 10 as a reasonable over-fetch factor. Atlas Vector
 *  Search first fetches `numCandidates` approximate neighbors, then
 *  returns the top `limit`. More candidates = better accuracy,
 *  but slightly higher latency.
 * ============================================================
 */

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
 * upsertResumeChunks (EXPORTED)
 * ------------------------------
 * Replaces ALL stored resume chunks for a user with the new batch.
 *
 * HOW IT WORKS:
 *  1. Delete all existing `resume_chunks` documents for this userId.
 *  2. Attach the pre-generated embeddings to each raw chunk.
 *  3. Insert all new chunks in a single `insertMany()` call.
 *
 * WHY DELETE-THEN-INSERT (not upsert per chunk)?
 * Resume updates should fully replace stale data. If a user uploads
 * a new resume, their old chunks are irrelevant and should be gone.
 * A delete-then-insert is simpler and cheaper than per-chunk upserts.
 *
 * @param userId     - Clerk userId to scope the operation.
 * @param rawChunks  - Array of section chunks from `chunkResumeText()`.
 * @param embeddings - Parallel array of 384-dim vectors from `embedTexts()`.
 */
export async function upsertResumeChunks(
  userId: string,
  rawChunks: RawResumeChunk[],
  embeddings: number[][],
): Promise<void> {
  if (rawChunks.length === 0) return;

  const db = await getMongoDb();
  const collection = db.collection<ResumeChunk>(RESUME_CHUNKS_COLLECTION);

  // Step 1: Delete all stale chunks for this user before inserting new ones
  // Remove old chunks for this user
  await collection.deleteMany({ userId });

  const now = new Date();
  // Step 2: Map raw chunks + embeddings into full ResumeChunk documents
  const docs: ResumeChunk[] = rawChunks.map((chunk, i) => ({
    userId,
    section: chunk.section,
    text: chunk.text,
    chunkIndex: chunk.chunkIndex,
    embedding: embeddings[i], // parallel array: embeddings[i] belongs to rawChunks[i]
    updatedAt: now,
  }));

  // Step 3: Insert all new chunks in one batched operation
  await collection.insertMany(docs);
}

/**
 * searchResumeChunks (EXPORTED)
 * ------------------------------
 * Searches resume chunks for a specific user using MongoDB Atlas
 * Vector Search. Returns the top-K most semantically similar chunks.
 *
 * The `$vectorSearch` stage does approximate nearest-neighbor search
 * over the `embedding` field using cosine similarity.
 *
 * `numCandidates: topK * 10` — over-fetches candidates to improve
 * accuracy. Atlas Vector Search is approximate; more candidates
 * means higher recall at a small cost to latency.
 *
 * Embedding vectors are excluded from results (they are large arrays
 * and not needed by the LLM prompt).
 *
 * @param userId        - Clerk userId to scope results to one user.
 * @param queryEmbedding - 384-dim query vector from embedQuery().
 * @param topK          - Number of chunks to return.
 * @returns             - Array of ResumeChunk objects (without embeddings).
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
          numCandidates: topK * 10, // over-fetch for better recall accuracy
          limit: topK,
          filter: { userId }, // scoped to this user only
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
 * storeConversationTurn (EXPORTED)
 * ---------------------------------
 * Stores a single completed interview Q&A turn in the
 * `conversation_memory_chunks` collection.
 *
 * The turn document must include a pre-generated embedding from
 * `combinedText = "Q: <question>\nA: <answer>"`. The caller
 * (saveMemory LangGraph node) is responsible for generating
 * this embedding before calling this function.
 *
 * @param turn - Full ConversationMemory document (without _id).
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
 * searchConversationMemory (EXPORTED)
 * -------------------------------------
 * Vector search over conversation memory for a specific session.
 * Returns the top-K Q&A turns most semantically similar to the query.
 *
 * IMPORTANT: Filters by BOTH userId AND sessionId.
 * This scopes retrieval to the CURRENT interview session only.
 * Using only userId would mix turns across different sessions.
 *
 * Embedding vectors are excluded from results to reduce payload size.
 *
 * @param userId        - Clerk userId.
 * @param sessionId     - Current interview session ID.
 * @param queryEmbedding - 384-dim query vector.
 * @param topK          - Number of similar turns to return.
 * @returns             - Array of ConversationMemory objects (without embeddings).
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
          numCandidates: topK * 10, // over-fetch for better recall accuracy
          limit: topK,
          filter: { userId, sessionId }, // scope to both user AND session
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
 * fetchRecentConversationTurns (EXPORTED)
 * ----------------------------------------
 * Fetches the last N conversation turns for a session using a
 * direct MongoDB sort + limit query — NOT vector search.
 *
 * WHY DIRECT FETCH INSTEAD OF VECTOR SEARCH?
 * Vector search finds SEMANTICALLY SIMILAR turns. But for
 * recent memory, we need CHRONOLOGICALLY ORDERED turns to
 * give the LLM conversational continuity. A direct sort on
 * `createdAt` descending (then reversed) achieves this.
 *
 * ARCHITECTURE NOTE:
 * According to the RAG design, recent memory must always be
 * fetched directly from MongoDB, never via vector search.
 * This is a hard constraint for chronological ordering.
 *
 * @param userId    - Clerk userId.
 * @param sessionId - Current interview session ID.
 * @param limit     - Maximum number of recent turns to return.
 * @returns         - ConversationMemory turns in chronological order (oldest first).
 */
export async function fetchRecentConversationTurns(
  userId: string,
  sessionId: string,
  limit = 5,
): Promise<ConversationMemory[]> {
  const db = await getMongoDb();

  // Fetch the most recent `limit` turns sorted newest-first
  const results = await db
    .collection<ConversationMemory>(CONVERSATION_CHUNKS_COLLECTION)
    .find({ userId, sessionId })
    .sort({ createdAt: -1 }) // newest first
    .limit(limit)
    .project({ embedding: 0 }) // exclude embedding vectors from payload
    .toArray();

  // Reverse so chronological order is preserved (oldest first)
  // The LLM processes context in reading order, so oldest turns come first
  return (results as unknown as ConversationMemory[]).reverse();
}
