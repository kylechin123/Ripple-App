import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

export const MODEL = process.env.RIPPLE_MODEL ?? "claude-opus-5-5";

let client: Anthropic | null = null;
function anthropic() {
  if (!client) client = new Anthropic();
  return client;
}

export const isDemoMode = () => process.env.DEMO_MODE === "true";
export const hasAnthropicKey = () => Boolean(process.env.ANTHROPIC_API_KEY);

/**
 * One structured call: JSON output constrained to a zod schema, validated again
 * on our side, retried once on a parse failure. Uses server-side refusal
 * fallbacks so a classifier false positive doesn't break the demo.
 */
export async function structuredCall<T extends z.ZodType>(opts: {
  schema: T;
  system: string;
  content: Anthropic.Beta.BetaContentBlockParam[] | string;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<z.infer<T>> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await anthropic().beta.messages.create({
        model: MODEL,
        max_tokens: opts.maxTokens ?? 8000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: opts.system,
        output_config: { effort: opts.effort ?? "low", format: zodOutputFormat(opts.schema) },
        messages: [{ role: "user", content: opts.content }],
      });
      if (response.stop_reason === "refusal") throw new Error("The AI declined this request");
      if (response.stop_reason === "max_tokens") throw new Error("AI response was cut off");
      const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
      return opts.schema.parse(JSON.parse(text));
    } catch (err) {
      lastError = err;
      if (err instanceof Anthropic.APIError && err.status !== undefined && err.status < 500 && err.status !== 429) break;
    }
  }
  throw lastError;
}
