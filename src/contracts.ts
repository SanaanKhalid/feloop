export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type ExecutionKind =
  | "agent"
  | "turn"
  | "inference"
  | "prediction"
  | "tool"
  | "workflow"
  | "retrieval"
  | "custom";

export type SignalKind =
  | "rating"
  | "correction"
  | "outcome"
  | "reward"
  | "approval"
  | "tool_result"
  | "custom";

export type CandidateTargetKind =
  | "prompt"
  | "routing"
  | "rule"
  | "retrieval"
  | "model"
  | "dataset"
  | "threshold"
  | "tool_schema"
  | "workflow"
  | "agent_topology"
  | "code"
  | "capacity"
  | "custom";

export type CandidateRisk = "low" | "medium" | "high" | "critical";

export type CandidateStatus =
  | "proposed"
  | "evaluated"
  | "approved"
  | "deployed"
  | "rejected"
  | "superseded";

export interface ArtifactVersions extends JsonObject {
  model?: string;
  dataset?: string;
  prompt?: string;
  router?: string;
  toolSchema?: string;
  knowledge?: string;
  policy?: string;
  application?: string;
}

export interface RecordExecutionInput {
  id?: string;
  namespace: string;
  kind: ExecutionKind;
  episodeId?: string;
  parentExecutionId?: string;
  entityId?: string;
  input?: JsonValue;
  output?: JsonValue;
  artifacts?: ArtifactVersions;
  metadata?: JsonObject;
  startedAt?: string;
  completedAt?: string;
}

export interface AiExecution {
  id: string;
  namespace: string;
  kind: ExecutionKind;
  episodeId?: string;
  parentExecutionId?: string;
  entityId?: string;
  input?: JsonValue;
  output?: JsonValue;
  artifacts: ArtifactVersions;
  metadata: JsonObject;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompleteExecutionInput {
  output?: JsonValue;
  metadata?: JsonObject;
  completedAt?: string;
}

export interface RecordSignalInput {
  id?: string;
  namespace: string;
  executionId?: string;
  episodeId?: string;
  kind: SignalKind;
  name: string;
  value: JsonValue;
  correction?: JsonValue;
  source: string;
  confidence?: number;
  metadata?: JsonObject;
  observedAt?: string;
}

export interface FeedbackSignal {
  id: string;
  namespace: string;
  executionId?: string;
  episodeId?: string;
  kind: SignalKind;
  name: string;
  value: JsonValue;
  correction?: JsonValue;
  source: string;
  confidence: number;
  metadata: JsonObject;
  observedAt: string;
  createdAt: string;
}

export interface Finding {
  id: string;
  namespace: string;
  dimensions: JsonObject;
  signalNames: string[];
  support: number;
  scoredCount: number;
  meanScore?: number;
  baselineScore?: number;
  effectSize?: number;
  confidence?: number;
  recurrence: number;
  distinctEntities: number;
  executionIds: string[];
  counterexampleExecutionIds: string[];
  correctionCounts: Record<string, number>;
  window: {
    from?: string;
    to?: string;
  };
}

export interface AnalyzeOptions {
  namespace: string;
  dimensions: string[];
  maximumDimensionDepth?: number;
  executionKinds?: ExecutionKind[];
  signalNames?: string[];
  signalKinds?: SignalKind[];
  since?: string;
  until?: string;
  minimumSupport?: number;
  minimumScoredCount?: number;
  minimumEffectSize?: number;
  minimumRecurrence?: number;
  minimumDistinctEntities?: number;
  timeBucket?: "day" | "week" | "month";
  includeEpisodeSignals?: boolean;
  entityPath?: string;
  score?: (signal: FeedbackSignal) => number | undefined;
}

export interface CandidateTarget {
  kind: CandidateTargetKind;
  key: string;
}

export interface CandidateEvaluation {
  id: string;
  passed: boolean;
  metrics: Record<string, number>;
  notes?: string;
  evaluator: string;
  createdAt: string;
}

export interface CreateCandidateInput {
  id?: string;
  namespace: string;
  target: CandidateTarget;
  proposedChange: JsonValue;
  evidence: JsonValue;
  risk?: CandidateRisk;
  metadata?: JsonObject;
}

export interface AdaptationCandidate {
  id: string;
  namespace: string;
  target: CandidateTarget;
  proposedChange: JsonValue;
  evidence: JsonValue;
  risk: CandidateRisk;
  metadata: JsonObject;
  evaluations: CandidateEvaluation[];
  status: CandidateStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  deployedAt?: string;
  supersededAt?: string;
  rejectedAt?: string;
}

export interface CandidateListOptions {
  namespace?: string;
  targetKey?: string;
  statuses?: CandidateStatus[];
}

export interface EvaluationResult {
  passed: boolean;
  metrics?: Record<string, number>;
  notes?: string;
}

export type CandidateEvaluator = (
  candidate: AdaptationCandidate,
) => EvaluationResult | Promise<EvaluationResult>;

export interface StoredState {
  version: 1;
  executions: AiExecution[];
  signals: FeedbackSignal[];
  candidates: AdaptationCandidate[];
}
