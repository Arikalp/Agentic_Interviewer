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
