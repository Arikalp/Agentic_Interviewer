import { existsSync } from 'fs';
import path from 'path';
import { EmbeddingModel, FlagEmbedding } from 'fastembed';

/**
 * Singleton FastEmbed wrapper using BAAI/bge-small-en-v1.5.
 *
 * Dimensions : 384
 * Similarity : Cosine
 *
 * The ONNX model is cached locally by fastembed. In production (Vercel
 * serverless) the working directory is read-only, so fastembed must never
 * attempt to write its cache there. The model is bundled with the deployment
 * via outputFileTracingIncludes (see next.config.js) and read directly from
 * local_cache; if it is missing we fall back to /tmp, which is writable.
 */

const bundledModelPath = path.join(
  process.cwd(),
  'local_cache',
  'Qdrant_bge-small-en-v1.5-onnx-Q',
  'model_optimized.onnx',
);

const cacheDir = existsSync(bundledModelPath)
  ? path.join(process.cwd(), 'local_cache')
  : '/tmp/fastembed-cache';

let embeddingModel: FlagEmbedding | null = null;

async function getModel(): Promise<FlagEmbedding> {
  if (!embeddingModel) {
    embeddingModel = await FlagEmbedding.init({
      model: EmbeddingModel.BGESmallENV15,
      cacheDir,
      // No console progress bars in serverless logs.
      showDownloadProgress: false,
    });
  }
  return embeddingModel;
}

/**
 * Embed a batch of texts.
 * Returns a 2-D array: one 384-dim vector per input text.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const model = await getModel();
  const allEmbeddings: number[][] = [];

  // fastembed.embed() returns an AsyncGenerator of Float32Array batches
  const generator = model.embed(texts, 32);
  for await (const batch of generator) {
    for (const vec of batch) {
      allEmbeddings.push(Array.from(vec));
    }
  }

  return allEmbeddings;
}

/**
 * Embed a single query string.
 * Returns a single 384-dim vector.
 *
 * Uses embed() under the hood (queryEmbed is not a standard fastembed method).
 */
export async function embedQuery(query: string): Promise<number[]> {
  const [vec] = await embedTexts([query]);
  return vec;
}
