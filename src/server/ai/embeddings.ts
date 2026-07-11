import "server-only";
import { env } from "@/lib/env";

const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
const EMBEDDING_DIMS = 1024;
const TIMEOUT_MS = 10_000;

export class EmbeddingUnavailableError extends Error {
  constructor(message = "Embeddings are unavailable") {
    super(message);
    this.name = "EmbeddingUnavailableError";
  }
}

type VoyageResponse = {
  data?: { embedding: number[]; index: number }[];
};

async function embed(
  texts: string[],
  inputType: "document" | "query",
): Promise<number[][]> {
  if (!env.VOYAGE_API_KEY) {
    throw new EmbeddingUnavailableError("VOYAGE_API_KEY is not configured");
  }
  if (texts.length === 0) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(VOYAGE_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${env.VOYAGE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.VOYAGE_MODEL,
        input: texts,
        input_type: inputType,
        output_dimension: EMBEDDING_DIMS,
      }),
    });
  } catch {
    throw new EmbeddingUnavailableError("Embedding request failed");
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new EmbeddingUnavailableError(`Voyage returned ${res.status}`);
  }

  const json = (await res.json()) as VoyageResponse;
  const data = json.data ?? [];
  // Voyage preserves order, but sort by index to be safe.
  return [...data].sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

/** Embed a stored document (memory text). `input_type: "document"`. */
export async function embedDocument(text: string): Promise<number[]> {
  const [vector] = await embed([text], "document");
  return vector;
}

/** Embed a search query. `input_type: "query"`. */
export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embed([text], "query");
  return vector;
}
