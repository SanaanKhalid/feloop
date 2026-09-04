import type {
  AdaptationCandidate,
  AiExecution,
  CandidateListOptions,
  FeedbackSignal,
  StoredState,
} from "../contracts.js";
import type {
  ExecutionListOptions,
  FeedbackStore,
  SignalListOptions,
} from "../store.js";
import { clone, timestampInRange } from "../utils.js";

function emptyState(): StoredState {
  return {
    version: 1,
    executions: [],
    signals: [],
    candidates: [],
  };
}

function replaceById<T extends { id: string }>(items: T[], value: T): void {
  const index = items.findIndex((item) => item.id === value.id);
  if (index === -1) {
    items.push(clone(value));
    return;
  }
  items[index] = clone(value);
}

export class InMemoryStore implements FeedbackStore {
  protected state: StoredState;

  constructor(initialState: StoredState = emptyState()) {
    this.state = clone(initialState);
  }

  async saveExecution(execution: AiExecution): Promise<void> {
    replaceById(this.state.executions, execution);
  }

  async getExecution(id: string): Promise<AiExecution | undefined> {
    const execution = this.state.executions.find((item) => item.id === id);
    return execution ? clone(execution) : undefined;
  }

  async listExecutions(options: ExecutionListOptions = {}): Promise<AiExecution[]> {
    return this.state.executions
      .filter(
        (execution) =>
          (!options.namespace || execution.namespace === options.namespace) &&
          timestampInRange(execution.startedAt, options.since, options.until),
      )
      .map(clone);
  }

  async saveSignal(signal: FeedbackSignal): Promise<void> {
    replaceById(this.state.signals, signal);
  }

  async listSignals(options: SignalListOptions = {}): Promise<FeedbackSignal[]> {
    return this.state.signals
      .filter(
        (signal) =>
          (!options.namespace || signal.namespace === options.namespace) &&
          timestampInRange(signal.observedAt, options.since, options.until),
      )
      .map(clone);
  }

  async saveCandidate(candidate: AdaptationCandidate): Promise<void> {
    replaceById(this.state.candidates, candidate);
  }

  async getCandidate(id: string): Promise<AdaptationCandidate | undefined> {
    const candidate = this.state.candidates.find((item) => item.id === id);
    return candidate ? clone(candidate) : undefined;
  }

  async listCandidates(options: CandidateListOptions = {}): Promise<AdaptationCandidate[]> {
    return this.state.candidates
      .filter(
        (candidate) =>
          (!options.namespace || candidate.namespace === options.namespace) &&
          (!options.targetKey || candidate.target.key === options.targetKey) &&
          (!options.statuses || options.statuses.includes(candidate.status)),
      )
      .map(clone);
  }

  snapshot(): StoredState {
    return clone(this.state);
  }

  async close(): Promise<void> {}
}

