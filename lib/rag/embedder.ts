/**
 * ============================================================
 * FILE: lib/rag/embedder.ts
 * PURPOSE: Singleton fastembed wrapper for generating text embeddings
 * ============================================================
 *
 * MODEL: BAAI/bge-small-en-v1.5 (via the `fastembed` npm package)
 *  - Output dimensions : 384
 *  - Similarity metric : Cosine
 *  - ONNX model size   : ~100 MB (downloaded once, cached locally)
 *
 * SINGLETON PATTERN:
 * Loading and initializing the ONNX model is expensive (several
 * seconds on first call). By storing the model in the module-level
 * `embeddingModel` variable, subsequent calls to `embedTexts()`
 * or `embedQuery()` reuse the already-loaded model.
 *
 * USAGE:
 *   import { embedTexts, embedQuery } from '@/lib/rag/embedder';
 *
 *   const vectors = await embedTexts(['Hello world', 'Foo bar']);
 *   // vectors is number[][] — one 384-dim vector per input
 *
 *   const queryVec = await embedQuery('React hooks');
 *   // queryVec is number[] — a single 384-dim vector
 * ============================================================
 */

import { EmbeddingModel, FlagEmbedding } from 'fastembed';

/**
 * Singleton FastEmbed wrapper using BAAI/bge-small-en-v1.5.
 *
 * Dimensions : 384
 * Similarity : Cosine
 *
 * The ONNX model (~100 MB) is downloaded on the first call and cached
 * locally by fastembed. Subsequent calls reuse the loaded model.
 */

// Module-level singleton — null until first `getModel()` call
let embeddingModel: FlagEmbedding | null = null;

/**
 * getModel (private)
 * ------------------
 * Returns the singleton FlagEmbedding model instance.
 * Initializes the model on the first call (triggers ONNX model download
 * if not already cached). Subsequent calls return the cached instance.
 */
async function getModel(): Promise<FlagEmbedding> {
  if (!embeddingModel) {
    embeddingModel = await FlagEmbedding.init({
      model: EmbeddingModel.BGESmallENV15,
    });
  }
  return embeddingModel;
}

/**
 * embedTexts
 * ----------
 * Embed a batch of texts.
 * Returns a 2-D array: one 384-dim vector per input text.
 *
 * HOW IT WORKS:
 *  1. Get the singleton model (loads/caches if not initialized).
 *  2. Call `model.embed(texts, batchSize)` which returns an
 *     AsyncGenerator of Float32Array batches.
 *  3. Iterate all batches, convert Float32Arrays to number[],
 *     and accumulate in a flat array.
 *
 * WHY AsyncGenerator?
 * Large text batches are processed in chunks of `batchSize` (32
 * here). The AsyncGenerator yields each chunk as it's processed,
 * allowing streaming instead of waiting for all embeddings at once.
 *
 * @param texts  - Array of strings to embed.
 * @returns      - 2-D number array: one 384-dim vector per input.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  // Short-circuit if no texts provided
  if (texts.length === 0) return [];

  const model = await getModel();
  const allEmbeddings: number[][] = [];

  // fastembed.embed() returns an AsyncGenerator of Float32Array batches
  // Batch size 32 is a good default for balancing memory and throughput
  const generator = model.embed(texts, 32);
  for await (const batch of generator) {
    // Each item in `batch` is a Float32Array — convert to plain number[]
    for (const vec of batch) {
      allEmbeddings.push(Array.from(vec));
    }
  }

  return allEmbeddings;
}

/**
 * embedQuery
 * ----------
 * Embed a single query string.
 * Returns a single 384-dim vector as a flat number[].
 *
 * This is a convenience wrapper over `embedTexts([query])`.
 * Used by the retrieval nodes when they need to embed the
 * current question or answer before doing a vector search.
 *
 * @param query  - A single string to embed.
 * @returns      - A single 384-dim embedding vector.
 */
export async function embedQuery(query: string): Promise<number[]> {
  // Wrap in array, embed, destructure the first (and only) result
  const [vec] = await embedTexts([query]);
  return vec;
}
