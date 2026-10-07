type GeminiAnnotation = { type?: string; url?: string; title?: string };
type GeminiContent = { type?: string; text?: string; annotations?: GeminiAnnotation[] };
type GeminiStep = { type?: string; content?: GeminiContent[] };
type GeminiInteraction = { output_text?: string; outputText?: string; steps?: GeminiStep[] };

export type GroundedSource = { title: string; url: string };

export function parseGeminiJson(text: string): unknown {
  let candidate = text.trim().replace(/^\uFEFF/, "");
  const fenced = candidate.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) candidate = fenced[1].trim();
  return JSON.parse(candidate);
}

export function geminiOutputText(body: unknown) {
  if (!body || typeof body !== "object") return "";
  const interaction = body as GeminiInteraction;
  if (interaction.output_text) return interaction.output_text;
  if (interaction.outputText) return interaction.outputText;
  return (interaction.steps ?? [])
    .filter((step) => step.type === "model_output")
    .flatMap((step) => step.content ?? [])
    .filter((content) => content.type === "text")
    .map((content) => content.text ?? "")
    .join("");
}

export function geminiGroundedSources(body: unknown): GroundedSource[] {
  if (!body || typeof body !== "object") return [];
  const seen = new Set<string>();
  const sources: GroundedSource[] = [];
  for (const step of (body as GeminiInteraction).steps ?? []) {
    for (const content of step.content ?? []) {
      for (const annotation of content.annotations ?? []) {
        if (annotation.type !== "url_citation" || !annotation.url) continue;
        try {
          const url = new URL(annotation.url);
          if (!/^https?:$/.test(url.protocol) || seen.has(url.href)) continue;
          seen.add(url.href);
          sources.push({ title: annotation.title || url.hostname, url: url.href });
        } catch {
          // Ignore malformed provider citations.
        }
      }
    }
  }
  return sources;
}
