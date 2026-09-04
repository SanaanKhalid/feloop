#!/usr/bin/env node

import type { CandidateStatus, ExecutionKind } from "./contracts.js";
import { FeedbackLoop } from "./feedback-loop.js";
import { JsonFileStore } from "./stores/json-file.js";

type Flags = Record<string, string | boolean>;

function parseFlags(args: string[]): Flags {
  const flags: Flags = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument?.startsWith("--")) {
      continue;
    }
    const key = argument.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    index += 1;
  }
  return flags;
}

function stringFlag(flags: Flags, name: string, required = false): string | undefined {
  const value = flags[name];
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (required) {
    throw new Error(`--${name} is required.`);
  }
  return undefined;
}

function numberFlag(flags: Flags, name: string): number | undefined {
  const value = stringFlag(flags, name);
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`--${name} must be a number.`);
  }
  return parsed;
}

function listFlag(flags: Flags, name: string): string[] | undefined {
  return stringFlag(flags, name)
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function help(): string {
  return `ai-feedback-loop

Usage:
  ai-feedback-loop analyze --store <file> --namespace <scope> --dimensions <paths>
  ai-feedback-loop candidates --store <file> [--namespace <scope>] [--status <statuses>]

Analyze options:
  --dimensions metadata.intent,artifacts.prompt
  --execution-kinds turn,inference
  --signal-names operator_rating,ticket_resolved
  --since 2026-08-01T00:00:00.000Z
  --until 2026-09-01T00:00:00.000Z
  --max-depth 2
  --min-support 5
  --min-scored 2
  --min-effect 0.1
  --min-recurrence 1
  --min-entities 0
  --entity-path metadata.operatorIdHash
  --time-bucket day|week|month
`;
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === "help" || command === "--help" || command === "-h") {
    process.stdout.write(help());
    return;
  }

  const flags = parseFlags(args);
  const storePath = stringFlag(flags, "store", true)!;
  const loop = new FeedbackLoop(new JsonFileStore(storePath));

  try {
    if (command === "analyze") {
      const namespace = stringFlag(flags, "namespace", true)!;
      const dimensions = listFlag(flags, "dimensions");
      if (!dimensions?.length) {
        throw new Error("--dimensions requires at least one comma-separated path.");
      }
      const timeBucket = stringFlag(flags, "time-bucket");
      if (timeBucket && !["day", "week", "month"].includes(timeBucket)) {
        throw new Error("--time-bucket must be day, week, or month.");
      }

      const executionKinds = listFlag(flags, "execution-kinds") as ExecutionKind[] | undefined;
      const signalNames = listFlag(flags, "signal-names");
      const since = stringFlag(flags, "since");
      const until = stringFlag(flags, "until");
      const maximumDimensionDepth = numberFlag(flags, "max-depth");
      const minimumSupport = numberFlag(flags, "min-support");
      const minimumScoredCount = numberFlag(flags, "min-scored");
      const minimumEffectSize = numberFlag(flags, "min-effect");
      const minimumRecurrence = numberFlag(flags, "min-recurrence");
      const minimumDistinctEntities = numberFlag(flags, "min-entities");
      const entityPath = stringFlag(flags, "entity-path");

      const findings = await loop.analyze({
        namespace,
        dimensions,
        ...(executionKinds ? { executionKinds } : {}),
        ...(signalNames ? { signalNames } : {}),
        ...(since ? { since } : {}),
        ...(until ? { until } : {}),
        ...(maximumDimensionDepth !== undefined
          ? { maximumDimensionDepth }
          : {}),
        ...(minimumSupport !== undefined
          ? { minimumSupport }
          : {}),
        ...(minimumScoredCount !== undefined
          ? { minimumScoredCount }
          : {}),
        ...(minimumEffectSize !== undefined
          ? { minimumEffectSize }
          : {}),
        ...(minimumRecurrence !== undefined
          ? { minimumRecurrence }
          : {}),
        ...(minimumDistinctEntities !== undefined
          ? { minimumDistinctEntities }
          : {}),
        ...(entityPath ? { entityPath } : {}),
        ...(timeBucket
          ? { timeBucket: timeBucket as "day" | "week" | "month" }
          : {}),
      });
      process.stdout.write(`${JSON.stringify(findings, null, 2)}\n`);
      return;
    }

    if (command === "candidates") {
      const namespace = stringFlag(flags, "namespace");
      const targetKey = stringFlag(flags, "target");
      const statuses = listFlag(flags, "status") as CandidateStatus[] | undefined;
      const candidates = await loop.listCandidates({
        ...(namespace ? { namespace } : {}),
        ...(targetKey ? { targetKey } : {}),
        ...(statuses ? { statuses } : {}),
      });
      process.stdout.write(`${JSON.stringify(candidates, null, 2)}\n`);
      return;
    }

    throw new Error(`Unknown command: ${command}`);
  } finally {
    await loop.close();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
