import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/errors";

let client: Anthropic | undefined;

export const models = {
  get fast() {
    return env.ANTHROPIC_FAST_MODEL;
  },
  get default() {
    return env.ANTHROPIC_DEFAULT_MODEL;
  },
  get strong() {
    return env.ANTHROPIC_STRONG_MODEL;
  },
};

export function getAnthropicClient(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    throw new ApiError(
      "AI_UNAVAILABLE",
      "The AI DJ is not configured right now",
    );
  }
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}
