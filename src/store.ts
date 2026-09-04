import type {
  AdaptationCandidate,
  AiExecution,
  CandidateListOptions,
  FeedbackSignal,
} from "./contracts.js";

export interface ExecutionListOptions {
  namespace?: string;
  since?: string;
  until?: string;
}

export interface SignalListOptions {
  namespace?: string;
  since?: string;
  until?: string;
}

export interface FeedbackStore {
  saveExecution(execution: AiExecution): Promise<void>;
  getExecution(id: string): Promise<AiExecution | undefined>;
  listExecutions(options?: ExecutionListOptions): Promise<AiExecution[]>;

  saveSignal(signal: FeedbackSignal): Promise<void>;
  listSignals(options?: SignalListOptions): Promise<FeedbackSignal[]>;

  saveCandidate(candidate: AdaptationCandidate): Promise<void>;
  getCandidate(id: string): Promise<AdaptationCandidate | undefined>;
  listCandidates(options?: CandidateListOptions): Promise<AdaptationCandidate[]>;

  close(): Promise<void>;
}

