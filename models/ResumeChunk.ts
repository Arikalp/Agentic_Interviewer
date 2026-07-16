/**
 * ============================================================
 * FILE: models/ResumeChunk.ts
 * PURPOSE: MongoDB document type for resume text chunks
 * ============================================================
 *
 * When a user uploads a resume, it is split into multiple
 * `ResumeChunk` documents by `chunkResumeText()` in chunker.ts.
 * Each chunk covers one semantic section (e.g., "Projects",
 * "Experience", "Skills") and is embedded as a 384-dim vector.
 *
 * WHY CHUNKS INSTEAD OF ONE DOCUMENT?
 * Embedding the entire resume as one vector loses granularity.
 * By splitting into focused chunks, the vector search can
 * retrieve just the relevant section (e.g., only "Projects"
 * when the candidate answered about project work), giving the
 * LLM higher-quality, more focused context.
 *
 * STORAGE:
 *  - All old chunks for a user are deleted before new ones
 *    are inserted (see `upsertResumeChunks()` in vector-store.ts).
 *  - This ensures stale resume data is never mixed with the new.
 *
 * COLLECTION: `resume_chunks`
 * VECTOR INDEX: `resume_vector_index` (Atlas UI)
 * ============================================================
 */

import type { ObjectId } from 'mongodb';

/**
 * A single chunk of a candidate's resume stored in the `resume_chunks` collection.
 * Each chunk belongs to a specific section and carries a 384-dim fastembed vector.
 */
export interface ResumeChunk {
  _id?: ObjectId;

  /** Clerk userId — used as a filter in vector search */
  userId: string;

  /** Section label (e.g. "Projects", "Experience", "Skills") */
  section: string;

  /** Plain-text content of the chunk */
  text: string;

  /** Chunk index within the same section, for ordering */
  chunkIndex: number;

  /** 384-dim BAAI/bge-small-en-v1.5 embedding */
  embedding: number[];

  /** When this chunk was stored / last updated */
  updatedAt: Date;
}
