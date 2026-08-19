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

let embeddingModel: FlagEmbedding | null = null;

async function getModel(): Promise<FlagEmbedding> {
  if (!embeddingModel) {
    embeddingModel = await FlagEmbedding.init({
      model: EmbeddingModel.BGESmallENV15,
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
