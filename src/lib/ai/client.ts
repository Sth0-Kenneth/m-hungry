import "server-only";
import { z } from "zod";
import { serverEnv } from "@/lib/server-env";
import { geminiGroundedSources, geminiOutputText, parseGeminiJson } from "./gemini-parsers";

type StructuredOptions<T> = {
  name: string;
  schema: z.ZodType<T>;
  jsonSchema: Record<string, unknown>;
  instructions: string;
  userText: string;
  imageUrl?: string;
};

export class GeminiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly retryAfter: string | null,
  ) {
    super(status === 429 ? "Gemini rate limit reached" : `Gemini request failed (${status})`);
    this.name = "GeminiRequestError";
  }
}

async function imageInput(imageUrl: string) {
  const response = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error("Image could not be loaded");
  const mimeType = (response.headers.get("content-type") ?? "").split(";")[0].toLowerCase();
  if (!new Set(["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"]).has(mimeType)) {
    throw new Error("Unsupported image type");
  }
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 10 * 1024 * 1024) throw new Error("Image is too large for AI processing");
  return { type: "image", data: Buffer.from(bytes).toString("base64"), mime_type: mimeType };
}

async function callGemini(body: Record<string, unknown>) {
  if (!serverEnv.GEMINI_API_KEY) throw new Error("Gemini is not configured");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": serverEnv.GEMINI_API_KEY,
      },
      body: JSON.stringify({ model: serverEnv.GEMINI_MODEL, store: false, ...body }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new GeminiRequestError(response.status, response.headers.get("retry-after"));
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function structuredResponse<T>(options: StructuredOptions<T>): Promise<T> {
  let lastError: unknown;
  const input: Array<Record<string, unknown>> = [{ type: "text", text: options.userText }];
  if (options.imageUrl) input.push(await imageInput(options.imageUrl));

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const body = await callGemini({
      input,
      system_instruction: `${options.instructions}\nReturn only JSON matching the requested schema, without Markdown code fences. Return only values supported by the evidence. Never claim food is safe from a date alone.`,
      response_format: { type: "text", mime_type: "application/json", schema: options.jsonSchema },
      generation_config: { thinking_level: "low", max_output_tokens: 8192 },
    });

    try {
      const direct = options.schema.safeParse(body);
      if (direct.success) return direct.data;
      return options.schema.parse(parseGeminiJson(geminiOutputText(body)));
    } catch (error) {
      lastError = error;
    }
  }
  console.error("Structured Gemini response failed", lastError instanceof Error ? lastError.message : "unknown");
  throw new Error("AI response could not be validated");
}

export async function groundedSearch(prompt: string) {
  const body = await callGemini({
    input: prompt,
    system_instruction:
      "Find real recipe article pages from original publishers. Do not invent URLs. Prefer direct recipe pages over search, tag, or category pages.",
    tools: [{ type: "google_search" }],
    generation_config: { thinking_level: "low", max_output_tokens: 4096 },
  });
  return { text: geminiOutputText(body), sources: geminiGroundedSources(body).slice(0, 8) };
}
