import { performance } from "node:perf_hooks";
import type { JsonObject } from "../../src/index.js";
import { integer, json, nonempty, object } from "../../src/utils.js";
export interface GenerateInput {
  instructions: string;
  input: string;
  schema: JsonObject;
  name: string;
  signal: AbortSignal;
}
export interface Generation {
  value: JsonObject;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
}
export interface GenerationProvider {
  readonly mode: "live" | "simulated";
  readonly model: string;
  generate(input: GenerateInput): Promise<Generation>;
}
export class OpenAIProvider implements GenerationProvider {
  readonly mode = "live" as const;
  readonly model: string;
  private requests = 0;
  constructor(
    private readonly options: {
      apiKey: string;
      model: string;
      maximumRequests?: number;
      maximumOutputTokens?: number;
      maximumInputBytes?: number;
      fetch?: typeof fetch;
    },
  ) {
    nonempty(options.apiKey, "OPENAI_API_KEY");
    nonempty(options.model, "OPENAI_MODEL");
    this.model = options.model;
    integer(options.maximumRequests ?? 80, "maximumRequests");
    integer(options.maximumOutputTokens ?? 2048, "maximumOutputTokens");
    integer(options.maximumInputBytes ?? 16384, "maximumInputBytes");
  }
  async generate(input: GenerateInput): Promise<Generation> {
    input.signal.throwIfAborted();
    json(input.input, this.options.maximumInputBytes ?? 16384);
    if (this.requests >= (this.options.maximumRequests ?? 80))
      throw new Error("Model request budget exhausted.");
    this.requests++;
    const started = performance.now();
    const response = await (this.options.fetch ?? fetch)(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.any([input.signal, AbortSignal.timeout(60000)]),
        body: JSON.stringify({
          model: this.model,
          store: false,
          instructions: input.instructions,
          input: input.input,
          max_output_tokens: this.options.maximumOutputTokens ?? 2048,
          text: {
            format: {
              type: "json_schema",
              name: input.name,
              strict: true,
              schema: input.schema,
            },
          },
        }),
      },
    );
    if (!response.ok)
      throw new Error(
        `OpenAI request failed (HTTP ${response.status}); no automatic retry.`,
      );
    input.signal.throwIfAborted();
    const body: unknown = await response.json();
    input.signal.throwIfAborted();
    object(body, "OpenAI response");
    if (body.status !== "completed" || !Array.isArray(body.output))
      throw new Error("OpenAI response was incomplete or malformed.");
    const texts: string[] = [];
    for (const item of body.output) {
      if (!item || item.type !== "message" || !Array.isArray(item.content))
        continue;
      for (const part of item.content) {
        if (part.type === "refusal")
          throw new Error(
            "Model refused; no candidate/result will be accepted.",
          );
        if (part.type === "output_text" && typeof part.text === "string")
          texts.push(part.text);
      }
    }
    if (!texts.length)
      throw new Error("OpenAI response contained no structured output.");
    const value: unknown = JSON.parse(texts.join(""));
    json(value);
    object(value, "structured output");
    const usage = body.usage as Record<string, unknown> | undefined;
    const tokens = (key: string) =>
      typeof usage?.[key] === "number" &&
      Number.isFinite(usage[key]) &&
      usage[key] >= 0
        ? (usage[key] as number)
        : null;
    return {
      value: value as JsonObject,
      model: typeof body.model === "string" ? body.model : this.model,
      inputTokens: tokens("input_tokens"),
      outputTokens: tokens("output_tokens"),
      latencyMs: performance.now() - started,
    };
  }
}
