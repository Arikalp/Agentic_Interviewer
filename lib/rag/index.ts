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
 * High-level helper: chunk, embed, and store resume vectors.
 * Called after a successful resume analysis in the resume POST route.
 * Failures are surfaced so the caller can decide whether to swallow them.
 */
export async function embedAndStoreResume(
  userId: string,
  resumeText: string,
): Promise<{ chunkCount: number }> {
  const chunks = chunkResumeText(resumeText);

  if (chunks.length === 0) {
    return { chunkCount: 0 };
  }

  const chunkTexts = chunks.map((c) => c.text);
  const embeddings = await embedTexts(chunkTexts);

  await upsertResumeChunks(userId, chunks, embeddings);

  return { chunkCount: chunks.length };
}
