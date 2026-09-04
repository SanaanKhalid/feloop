import type {
  AdaptationCandidate,
  AiExecution,
  AnalyzeOptions,
  CandidateEvaluator,
  CandidateListOptions,
  CompleteExecutionInput,
  CreateCandidateInput,
  FeedbackSignal,
  Finding,
  JsonObject,
  JsonValue,
  RecordExecutionInput,
  RecordSignalInput,
} from "./contracts.js";
import { analyzePatterns } from "./analyzer.js";
import type { FeedbackStore } from "./store.js";
import { assertNonEmpty, clone, createId, mergeJsonObjects } from "./utils.js";

export interface FeedbackLoopOptions {
  clock?: () => Date;
  idFactory?: (prefix: string) => string;
}

export class FeedbackLoop {
  private readonly clock: () => Date;
  private readonly idFactory: (prefix: string) => string;

  constructor(
    readonly store: FeedbackStore,
    options: FeedbackLoopOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
    this.idFactory = options.idFactory ?? createId;
  }

  private now(): string {
    return this.clock().toISOString();
  }

  async recordExecution(input: RecordExecutionInput): Promise<AiExecution> {
    const now = this.now();
    const namespace = assertNonEmpty(input.namespace, "namespace");

    if (input.parentExecutionId) {
      const parent = await this.store.getExecution(input.parentExecutionId);
      if (!parent) {
        throw new Error(`Parent execution ${input.parentExecutionId} does not exist.`);
      }
      if (parent.namespace !== namespace) {
        throw new Error("Parent and child executions must use the same namespace.");
      }
      if (input.episodeId && parent.episodeId && input.episodeId !== parent.episodeId) {
        throw new Error("Parent and child executions must use the same episodeId.");
      }
    }

    const execution: AiExecution = {
      id: input.id ?? this.idFactory("exec"),
      namespace,
      kind: input.kind,
      ...(input.episodeId ? { episodeId: input.episodeId } : {}),
      ...(input.parentExecutionId ? { parentExecutionId: input.parentExecutionId } : {}),
      ...(input.entityId ? { entityId: input.entityId } : {}),
      ...(input.input !== undefined ? { input: clone(input.input) } : {}),
      ...(input.output !== undefined ? { output: clone(input.output) } : {}),
      artifacts: clone(input.artifacts ?? {}),
      metadata: clone(input.metadata ?? {}),
      startedAt: input.startedAt ?? now,
      ...(input.completedAt ? { completedAt: input.completedAt } : {}),
      createdAt: now,
      updatedAt: now,
    };

    await this.store.saveExecution(execution);
    return clone(execution);
  }

  async completeExecution(
    executionId: string,
    input: CompleteExecutionInput = {},
  ): Promise<AiExecution> {
    const execution = await this.requireExecution(executionId);
    const updated: AiExecution = {
      ...execution,
      ...(input.output !== undefined ? { output: clone(input.output) } : {}),
      metadata: mergeJsonObjects(execution.metadata, input.metadata),
      completedAt: input.completedAt ?? this.now(),
      updatedAt: this.now(),
    };
    await this.store.saveExecution(updated);
    return clone(updated);
  }

  async recordSignal(input: RecordSignalInput): Promise<FeedbackSignal> {
    const namespace = assertNonEmpty(input.namespace, "namespace");
    if (!input.executionId && !input.episodeId) {
      throw new Error("A signal requires executionId or episodeId.");
    }
    if (input.executionId) {
      const execution = await this.requireExecution(input.executionId);
      if (execution.namespace !== namespace) {
        throw new Error("Signal and execution must use the same namespace.");
      }
      if (input.episodeId && execution.episodeId && input.episodeId !== execution.episodeId) {
        throw new Error("Signal episodeId does not match the target execution.");
      }
    }

    const confidence = input.confidence ?? 1;
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      throw new Error("signal confidence must be between 0 and 1.");
    }

    const now = this.now();
    const signal: FeedbackSignal = {
      id: input.id ?? this.idFactory("signal"),
      namespace,
      ...(input.executionId ? { executionId: input.executionId } : {}),
      ...(input.episodeId ? { episodeId: input.episodeId } : {}),
      kind: input.kind,
      name: assertNonEmpty(input.name, "signal name"),
      value: clone(input.value),
      ...(input.correction !== undefined ? { correction: clone(input.correction) } : {}),
      source: assertNonEmpty(input.source, "signal source"),
      confidence,
      metadata: clone(input.metadata ?? {}),
      observedAt: input.observedAt ?? now,
      createdAt: now,
    };

    await this.store.saveSignal(signal);
    return clone(signal);
  }

  async analyze(options: AnalyzeOptions): Promise<Finding[]> {
    return analyzePatterns(this.store, options);
  }

  async createCandidate(input: CreateCandidateInput): Promise<AdaptationCandidate> {
    const now = this.now();
    const candidate: AdaptationCandidate = {
      id: input.id ?? this.idFactory("candidate"),
      namespace: assertNonEmpty(input.namespace, "namespace"),
      target: {
        kind: input.target.kind,
        key: assertNonEmpty(input.target.key, "candidate target key"),
      },
      proposedChange: clone(input.proposedChange),
      evidence: clone(input.evidence),
      risk: input.risk ?? "medium",
      metadata: clone(input.metadata ?? {}),
      evaluations: [],
      status: "proposed",
      createdAt: now,
      updatedAt: now,
    };
    await this.store.saveCandidate(candidate);
    return clone(candidate);
  }

  async createCandidateFromFinding(input: {
    finding: Finding;
    target: CreateCandidateInput["target"];
    proposedChange: JsonValue;
    risk?: CreateCandidateInput["risk"];
    metadata?: JsonObject;
  }): Promise<AdaptationCandidate> {
    const finding = input.finding;
    const evidence: JsonObject = {
      findingId: finding.id,
      dimensions: finding.dimensions,
      support: finding.support,
      scoredCount: finding.scoredCount,
      recurrence: finding.recurrence,
      distinctEntities: finding.distinctEntities,
      correctionCounts: finding.correctionCounts,
      executionIds: finding.executionIds,
      ...(finding.meanScore !== undefined ? { meanScore: finding.meanScore } : {}),
      ...(finding.baselineScore !== undefined ? { baselineScore: finding.baselineScore } : {}),
      ...(finding.effectSize !== undefined ? { effectSize: finding.effectSize } : {}),
      ...(finding.confidence !== undefined ? { confidence: finding.confidence } : {}),
    };
    return this.createCandidate({
      namespace: finding.namespace,
      target: input.target,
      proposedChange: input.proposedChange,
      evidence,
      ...(input.risk ? { risk: input.risk } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    });
  }

  async evaluateCandidate(
    candidateId: string,
    evaluatorName: string,
    evaluator: CandidateEvaluator,
  ): Promise<AdaptationCandidate> {
    const candidate = await this.requireCandidate(candidateId);
    if (["deployed", "superseded", "rejected"].includes(candidate.status)) {
      throw new Error(`Candidate ${candidateId} cannot be evaluated from ${candidate.status}.`);
    }

    const result = await evaluator(clone(candidate));
    const now = this.now();
    const updated: AdaptationCandidate = {
      ...candidate,
      evaluations: [
        ...candidate.evaluations,
        {
          id: this.idFactory("evaluation"),
          passed: result.passed,
          metrics: clone(result.metrics ?? {}),
          ...(result.notes ? { notes: result.notes } : {}),
          evaluator: assertNonEmpty(evaluatorName, "evaluator name"),
          createdAt: now,
        },
      ],
      status: "evaluated",
      updatedAt: now,
    };
    await this.store.saveCandidate(updated);
    return clone(updated);
  }

  async approveCandidate(candidateId: string): Promise<AdaptationCandidate> {
    const candidate = await this.requireCandidate(candidateId);
    const latestEvaluation = candidate.evaluations.at(-1);
    if (candidate.status !== "evaluated" || !latestEvaluation?.passed) {
      throw new Error("A candidate requires a passing latest evaluation before approval.");
    }
    const now = this.now();
    const updated: AdaptationCandidate = {
      ...candidate,
      status: "approved",
      approvedAt: now,
      updatedAt: now,
    };
    await this.store.saveCandidate(updated);
    return clone(updated);
  }

  async deployCandidate(candidateId: string): Promise<AdaptationCandidate> {
    const candidate = await this.requireCandidate(candidateId);
    if (candidate.status !== "approved") {
      throw new Error("Only an approved candidate can be deployed.");
    }
    const now = this.now();
    const deployed = await this.store.listCandidates({
      namespace: candidate.namespace,
      targetKey: candidate.target.key,
      statuses: ["deployed"],
    });
    for (const current of deployed) {
      if (current.target.kind !== candidate.target.kind || current.id === candidate.id) {
        continue;
      }
      await this.store.saveCandidate({
        ...current,
        status: "superseded",
        supersededAt: now,
        updatedAt: now,
      });
    }

    const updated: AdaptationCandidate = {
      ...candidate,
      status: "deployed",
      deployedAt: now,
      updatedAt: now,
    };
    await this.store.saveCandidate(updated);
    return clone(updated);
  }

  async rejectCandidate(candidateId: string, reason?: string): Promise<AdaptationCandidate> {
    const candidate = await this.requireCandidate(candidateId);
    if (candidate.status === "deployed") {
      throw new Error("Rollback a deployed candidate instead of rejecting it.");
    }
    const now = this.now();
    const updated: AdaptationCandidate = {
      ...candidate,
      status: "rejected",
      rejectedAt: now,
      metadata: reason
        ? mergeJsonObjects(candidate.metadata, { rejectionReason: reason })
        : candidate.metadata,
      updatedAt: now,
    };
    await this.store.saveCandidate(updated);
    return clone(updated);
  }

  async rollbackCandidate(candidateId: string): Promise<AdaptationCandidate | undefined> {
    const candidate = await this.requireCandidate(candidateId);
    if (candidate.status !== "deployed") {
      throw new Error("Only a deployed candidate can be rolled back.");
    }
    const candidates = await this.store.listCandidates({
      namespace: candidate.namespace,
      targetKey: candidate.target.key,
    });
    const previous = candidates
      .filter(
        (item) =>
          item.target.kind === candidate.target.kind &&
          item.status === "superseded" &&
          item.id !== candidate.id,
      )
      .sort((left, right) =>
        (right.supersededAt ?? right.updatedAt).localeCompare(
          left.supersededAt ?? left.updatedAt,
        ),
      )[0];
    const now = this.now();
    await this.store.saveCandidate({
      ...candidate,
      status: "superseded",
      supersededAt: now,
      metadata: mergeJsonObjects(candidate.metadata, { rollback: true }),
      updatedAt: now,
    });
    if (!previous) {
      return undefined;
    }

    const restored: AdaptationCandidate = {
      ...previous,
      status: "deployed",
      deployedAt: now,
      updatedAt: now,
    };
    delete restored.supersededAt;
    await this.store.saveCandidate(restored);
    return clone(restored);
  }

  async getExecution(id: string): Promise<AiExecution | undefined> {
    return this.store.getExecution(id);
  }

  async getCandidate(id: string): Promise<AdaptationCandidate | undefined> {
    return this.store.getCandidate(id);
  }

  async listCandidates(options: CandidateListOptions = {}): Promise<AdaptationCandidate[]> {
    return this.store.listCandidates(options);
  }

  async close(): Promise<void> {
    await this.store.close();
  }

  private async requireExecution(id: string): Promise<AiExecution> {
    const execution = await this.store.getExecution(id);
    if (!execution) {
      throw new Error(`Execution ${id} does not exist.`);
    }
    return execution;
  }

  private async requireCandidate(id: string): Promise<AdaptationCandidate> {
    const candidate = await this.store.getCandidate(id);
    if (!candidate) {
      throw new Error(`Candidate ${id} does not exist.`);
    }
    return candidate;
  }
}
