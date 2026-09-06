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
interface ResponseOptions {
  model: string;
  maximumRequests?: number;
  maximumOutputTokens?: number;
  maximumInputBytes?: number;
  fetch?: typeof fetch;
}
class ResponsesProvider implements GenerationProvider {
  readonly mode = "live" as const;
  readonly model: string;
  private requests = 0;
  constructor(
    private readonly options: ResponseOptions,
    private readonly endpoint: string,
    private readonly authenticate: (signal: AbortSignal) => Promise<Record<string, string>>,
  ) {
    nonempty(options.model, "model/deployment");
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
    const signal = AbortSignal.any([input.signal, AbortSignal.timeout(60000)]);
    const authentication = await this.authenticate(signal);
    signal.throwIfAborted();
    const response = await (this.options.fetch ?? fetch)(
      this.endpoint,
      {
        method: "POST",
        headers: {
          ...authentication,
          "Content-Type": "application/json",
        },
        signal,
        redirect: "error",
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

export class OpenAIProvider extends ResponsesProvider {
  constructor(options: ResponseOptions & { apiKey: string }) {
    nonempty(options.apiKey, "OPENAI_API_KEY");
    super(options, "https://api.openai.com/v1/responses", async () => ({
      Authorization: `Bearer ${options.apiKey}`,
    }));
  }
}

export class AzureOpenAIProvider extends ResponsesProvider {
  constructor(options: ResponseOptions & {
    endpoint: string;
    apiKey?: string;
    tokenProvider?: (signal: AbortSignal) => Promise<string>;
  }) {
    const endpoint = new URL(options.endpoint);
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password ||
        endpoint.search || endpoint.hash || endpoint.pathname !== "/")
      throw new Error("Azure endpoint must be an HTTPS resource origin without a path or credentials.");
    if (Boolean(options.apiKey) === Boolean(options.tokenProvider))
      throw new Error("Configure exactly one Azure API key or token provider.");
    if (options.apiKey) nonempty(options.apiKey, "AZURE_OPENAI_API_KEY");
    super(options, new URL("openai/v1/responses", endpoint).href, async (signal) => {
      if (options.tokenProvider) {
        const token = await options.tokenProvider(signal);
        nonempty(token, "Azure authentication token");
        return { Authorization: `Bearer ${token}` };
      }
      return { "api-key": options.apiKey! };
    });
  }
}
