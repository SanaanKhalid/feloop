import { createHash } from "node:crypto";
import type {
  AiExecution,
  AnalyzeOptions,
  FeedbackSignal,
  Finding,
  JsonObject,
  JsonValue,
} from "./contracts.js";
import type { FeedbackStore } from "./store.js";
import { getPath, stableJson } from "./utils.js";

type ScoredSignal = {
  execution: AiExecution;
  signal: FeedbackSignal;
  score: number | undefined;
};

type Segment = {
  dimensions: JsonObject;
  executionIds: Set<string>;
  signals: ScoredSignal[];
};

export function defaultSignalScore(signal: FeedbackSignal): number | undefined {
  if (typeof signal.value === "boolean") {
    return signal.value ? 1 : 0;
  }

  if (typeof signal.value === "number" && Number.isFinite(signal.value)) {
    return signal.value;
  }

  if (typeof signal.value !== "string") {
    return undefined;
  }

  const value = signal.value.trim().toLowerCase();
  if (
    ["positive", "up", "helpful", "correct", "success", "succeeded", "approved", "resolved"].includes(
      value,
    )
  ) {
    return 1;
  }
  if (
    [
      "negative",
      "down",
      "unhelpful",
      "incorrect",
      "failure",
      "failed",
      "denied",
      "reopened",
    ].includes(value)
  ) {
    return 0;
  }
  return undefined;
}

function combinations<T>(values: T[], maximumDepth: number): T[][] {
  const output: T[][] = [];

  function visit(start: number, selected: T[]): void {
    if (selected.length > 0) {
      output.push([...selected]);
    }
    if (selected.length >= maximumDepth) {
      return;
    }
    for (let index = start; index < values.length; index += 1) {
      const value = values[index];
      if (value === undefined) {
        continue;
      }
      selected.push(value);
      visit(index + 1, selected);
      selected.pop();
    }
  }

  visit(0, []);
  return output;
}

function weightedMean(values: Array<{ value: number; weight: number }>): number | undefined {
  const totalWeight = values.reduce((total, item) => total + item.weight, 0);
  if (totalWeight <= 0) {
    return undefined;
  }
  return values.reduce((total, item) => total + item.value * item.weight, 0) / totalWeight;
}

function meanAndVariance(values: number[]): { mean: number; variance: number } | undefined {
  if (values.length === 0) {
    return undefined;
  }
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  if (values.length === 1) {
    return { mean, variance: 0 };
  }
  const variance =
    values.reduce((total, value) => total + (value - mean) ** 2, 0) / (values.length - 1);
  return { mean, variance };
}

function normalCdf(value: number): number {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const coefficients = [
    0.254829592,
    -0.284496736,
    1.421413741,
    -1.453152027,
    1.061405429,
  ];
  const polynomial =
    ((((coefficients[4]! * t + coefficients[3]!) * t + coefficients[2]!) * t +
      coefficients[1]!) *
      t +
      coefficients[0]!) *
    t;
  const erf = sign * (1 - polynomial * Math.exp(-(x ** 2)));
  return 0.5 * (1 + erf);
}

function differenceConfidence(group: number[], rest: number[]): number | undefined {
  const groupStats = meanAndVariance(group);
  const restStats = meanAndVariance(rest);
  if (!groupStats || !restStats || group.length < 2 || rest.length < 2) {
    return undefined;
  }

  const standardError = Math.sqrt(
    groupStats.variance / group.length + restStats.variance / rest.length,
  );
  if (standardError === 0) {
    return groupStats.mean === restStats.mean ? 0 : 1;
  }

  const z = Math.abs(groupStats.mean - restStats.mean) / standardError;
  return Math.max(0, Math.min(1, 2 * normalCdf(z) - 1));
}

function timeBucket(timestamp: string, size: "day" | "week" | "month"): string {
  const date = new Date(timestamp);
  if (size === "month") {
    return date.toISOString().slice(0, 7);
  }
  if (size === "day") {
    return date.toISOString().slice(0, 10);
  }

  const monday = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = monday.getUTCDay() || 7;
  monday.setUTCDate(monday.getUTCDate() - day + 1);
  return monday.toISOString().slice(0, 10);
}

function findingId(namespace: string, dimensions: JsonObject, signalNames: string[]): string {
  const digest = createHash("sha256")
    .update(`${namespace}\n${stableJson(dimensions)}\n${signalNames.sort().join(",")}`)
    .digest("hex")
    .slice(0, 20);
  return `finding_${digest}`;
}

function scoreForSort(finding: Finding): number {
  return Math.abs(finding.effectSize ?? 0) * Math.sqrt(finding.scoredCount);
}

export async function analyzePatterns(
  store: FeedbackStore,
  options: AnalyzeOptions,
): Promise<Finding[]> {
  if (!options.namespace.trim()) {
    throw new Error("namespace must not be empty.");
  }
  if (options.dimensions.length === 0) {
    throw new Error("At least one analysis dimension is required.");
  }

  const minimumSupport = options.minimumSupport ?? 5;
  const minimumScoredCount = options.minimumScoredCount ?? 2;
  const minimumEffectSize = options.minimumEffectSize ?? 0;
  const minimumRecurrence = options.minimumRecurrence ?? 1;
  const minimumDistinctEntities = options.minimumDistinctEntities ?? 0;
  const bucketSize = options.timeBucket ?? "week";
  const scoreSignal = options.score ?? defaultSignalScore;
  const maximumDepth = Math.min(
    Math.max(options.maximumDimensionDepth ?? Math.min(options.dimensions.length, 2), 1),
    options.dimensions.length,
  );

  const executions = (await store.listExecutions({
    namespace: options.namespace,
    ...(options.since ? { since: options.since } : {}),
    ...(options.until ? { until: options.until } : {}),
  })).filter(
    (execution) =>
      !options.executionKinds || options.executionKinds.includes(execution.kind),
  );
  const executionIds = new Set(executions.map((execution) => execution.id));
  const episodeIds = new Set(
    executions.flatMap((execution) => (execution.episodeId ? [execution.episodeId] : [])),
  );

  const signals = (await store.listSignals({
    namespace: options.namespace,
    ...(options.since ? { since: options.since } : {}),
    ...(options.until ? { until: options.until } : {}),
  })).filter(
    (signal) =>
      (!options.signalNames || options.signalNames.includes(signal.name)) &&
      (!options.signalKinds || options.signalKinds.includes(signal.kind)) &&
      ((signal.executionId && executionIds.has(signal.executionId)) ||
        (options.includeEpisodeSignals !== false &&
          signal.episodeId &&
          episodeIds.has(signal.episodeId))),
  );

  const directSignals = new Map<string, FeedbackSignal[]>();
  const episodeSignals = new Map<string, FeedbackSignal[]>();
  for (const signal of signals) {
    if (signal.executionId) {
      const existing = directSignals.get(signal.executionId) ?? [];
      existing.push(signal);
      directSignals.set(signal.executionId, existing);
    } else if (signal.episodeId) {
      const existing = episodeSignals.get(signal.episodeId) ?? [];
      existing.push(signal);
      episodeSignals.set(signal.episodeId, existing);
    }
  }

  const scoredByExecution = new Map<string, ScoredSignal[]>();
  const allScoredSignals: ScoredSignal[] = [];
  for (const execution of executions) {
    const attached = [
      ...(directSignals.get(execution.id) ?? []),
      ...(options.includeEpisodeSignals !== false && execution.episodeId
        ? (episodeSignals.get(execution.episodeId) ?? [])
        : []),
    ];
    const scored = attached.map((signal) => ({
      execution,
      signal,
      score: scoreSignal(signal),
    }));
    scoredByExecution.set(execution.id, scored);
    allScoredSignals.push(...scored);
  }

  const baselineValues = allScoredSignals.flatMap((item) =>
    item.score === undefined
      ? []
      : [{ value: item.score, weight: item.signal.confidence }],
  );
  const baselineScore = weightedMean(baselineValues);
  const dimensionSets = combinations(options.dimensions, maximumDepth);
  const segments = new Map<string, Segment>();

  for (const execution of executions) {
    for (const dimensionSet of dimensionSets) {
      const dimensions: JsonObject = {};
      let complete = true;
      for (const path of dimensionSet) {
        const value = getPath(execution, path);
        if (value === undefined) {
          complete = false;
          break;
        }
        dimensions[path] = value;
      }
      if (!complete) {
        continue;
      }

      const key = stableJson(dimensions);
      const segment = segments.get(key) ?? {
        dimensions,
        executionIds: new Set<string>(),
        signals: [],
      };
      segment.executionIds.add(execution.id);
      segment.signals.push(...(scoredByExecution.get(execution.id) ?? []));
      segments.set(key, segment);
    }
  }

  const findings: Finding[] = [];
  for (const segment of segments.values()) {
    const support = segment.executionIds.size;
    const scoredSignals = segment.signals.filter(
      (item): item is ScoredSignal & { score: number } => item.score !== undefined,
    );
    const scoredCount = scoredSignals.length;
    if (support < minimumSupport || scoredCount < minimumScoredCount) {
      continue;
    }

    const meanScore = weightedMean(
      scoredSignals.map((item) => ({ value: item.score, weight: item.signal.confidence })),
    );
    const effectSize =
      meanScore !== undefined && baselineScore !== undefined
        ? meanScore - baselineScore
        : undefined;
    if (effectSize !== undefined && Math.abs(effectSize) < minimumEffectSize) {
      continue;
    }

    const recurrence = new Set(
      segment.signals.map((item) => timeBucket(item.signal.observedAt, bucketSize)),
    ).size;
    if (recurrence < minimumRecurrence) {
      continue;
    }

    const entities = new Set<string>();
    for (const executionId of segment.executionIds) {
      const execution = executions.find((item) => item.id === executionId);
      if (!execution) {
        continue;
      }
      const entity = options.entityPath
        ? getPath(execution, options.entityPath)
        : execution.entityId;
      if (typeof entity === "string" || typeof entity === "number") {
        entities.add(String(entity));
      }
    }
    if (entities.size < minimumDistinctEntities) {
      continue;
    }

    const groupScores = scoredSignals.map((item) => item.score);
    const restScores = allScoredSignals.flatMap((item) =>
      item.score !== undefined && !segment.executionIds.has(item.execution.id) ? [item.score] : [],
    );
    const confidence = differenceConfidence(groupScores, restScores);
    const correctionCounts: Record<string, number> = {};
    for (const item of segment.signals) {
      if (item.signal.correction === undefined) {
        continue;
      }
      const correction = stableJson(item.signal.correction);
      correctionCounts[correction] = (correctionCounts[correction] ?? 0) + 1;
    }

    const signalNames = [...new Set(segment.signals.map((item) => item.signal.name))].sort();
    const counterexampleExecutionIds = scoredSignals
      .filter((item) => meanScore !== undefined && item.score > meanScore)
      .map((item) => item.execution.id)
      .filter((id, index, values) => values.indexOf(id) === index)
      .slice(0, 20);

    findings.push({
      id: findingId(options.namespace, segment.dimensions, signalNames),
      namespace: options.namespace,
      dimensions: segment.dimensions,
      signalNames,
      support,
      scoredCount,
      ...(meanScore !== undefined ? { meanScore } : {}),
      ...(baselineScore !== undefined ? { baselineScore } : {}),
      ...(effectSize !== undefined ? { effectSize } : {}),
      ...(confidence !== undefined ? { confidence } : {}),
      recurrence,
      distinctEntities: entities.size,
      executionIds: [...segment.executionIds].slice(0, 100),
      counterexampleExecutionIds,
      correctionCounts,
      window: {
        ...(options.since ? { from: options.since } : {}),
        ...(options.until ? { to: options.until } : {}),
      },
    });
  }

  return findings.sort((left, right) => scoreForSort(right) - scoreForSort(left));
}
