/**
 * ============================================================
 * FILE: lib/rag/index.ts
 * PURPOSE: Public surface of the RAG (Retrieval-Augmented Generation) pipeline
 * ============================================================
 *
 * This file is the single entry point for all RAG functionality.
 * It re-exports the individual module functions and provides the
 * high-level `embedAndStoreResume()` convenience function that
 * is called from the resume upload API route.
 *
 * ARCHITECTURE OVERVIEW:
 *  ┌──────────────────────────────────────────────────────────────┐
 *  │ Resume Upload                                            │
 *  │   ↓ text extracted                                      │
 *  │ embedAndStoreResume(userId, text)                        │
 *  │   ↓ chunker.ts → splits into sections                    │
 *  │   ↓ embedder.ts → 384-dim vectors                         │
 *  │   ↓ vector-store.ts → MongoDB Atlas insert               │
 *  └──────────────────────────────────────────────────────────────┘
 *
 * USAGE in resume upload route:
 *   import { embedAndStoreResume } from '@/lib/rag';
 *   await embedAndStoreResume(userId, rawResumeText);
 *
 * USAGE in interview flow:
 *   import { runInterviewRAG } from '@/lib/rag';
 *   const result = await runInterviewRAG({ ... });
 * ============================================================
 */

/**
 * Public surface of the RAG pipeline.
 *
 * Usage in resume upload route:
 *   import { embedAndStoreResume } from '@/lib/rag';
 *   await embedAndStoreResume(userId, rawResumeText);
 *
 * Usage in interview flow:
 *   import { runInterviewRAG } from '@/lib/rag';
 *   const result = await runInterviewRAG({ ... });
 */

export { embedTexts, embedQuery } from '@/lib/rag/embedder';
export { chunkResumeText } from '@/lib/rag/chunker';
export {
  upsertResumeChunks,
  searchResumeChunks,
  storeConversationTurn,
  searchConversationMemory,
  fetchRecentConversationTurns,
} from '@/lib/rag/vector-store';
export { retrieveAll } from '@/lib/rag/retriever';
export { buildRAGContext } from '@/lib/rag/context-builder';

import { chunkResumeText } from '@/lib/rag/chunker';
import { embedTexts } from '@/lib/rag/embedder';
import { upsertResumeChunks } from '@/lib/rag/vector-store';

/**
 * embedAndStoreResume (EXPORTED, ASYNC)
 * ---------------------------------------
 * High-level convenience function that orchestrates the full
 * resume ingestion pipeline in three steps:
 *
 *  Step 1 — CHUNK: Split the raw resume text into structured
 *            sections using `chunkResumeText()`. Sections like
 *            "Projects", "Experience", "Skills" become separate
 *            chunks for more precise vector retrieval.
 *
 *  Step 2 — EMBED: Generate a 384-dim vector for each chunk
 *            using `embedTexts()`. All chunks are embedded in a
 *            single batch for efficiency.
 *
 *  Step 3 — STORE: Call `upsertResumeChunks()` which deletes
 *            any old chunks for this user and inserts the new ones.
 *            This ensures resume updates replace stale data.
 *
 * WHY IS THIS CALLED "IN THE BACKGROUND"?
 * The resume route fires this as a non-awaited promise so the
 * HTTP response is not blocked by the embedding step (which
 * can take 2–5 seconds). Failures are caught and logged but
 * never surfaced to the client.
 *
 * @param userId     - Clerk userId to associate chunks with.
 * @param resumeText - Raw extracted plain text from the resume.
 * @returns          - Object with `chunkCount` for logging.
 */
export async function embedAndStoreResume(
  userId: string,
  resumeText: string,
): Promise<{ chunkCount: number }> {
  // Step 1: Split the resume text into semantic section chunks
  const chunks = chunkResumeText(resumeText);

  // If no meaningful chunks were found, return early
  if (chunks.length === 0) {
    return { chunkCount: 0 };
  }

  // Step 2: Extract text from each chunk and embed them all in one batch
  const chunkTexts = chunks.map((c) => c.text);
  const embeddings = await embedTexts(chunkTexts);

  // Step 3: Delete old chunks for this user and insert the new ones
  await upsertResumeChunks(userId, chunks, embeddings);

  return { chunkCount: chunks.length };
}
