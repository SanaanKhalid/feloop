import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
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

/**
 * A dependency-free local development store.
 *
 * Writes are serialized and use a temporary-file rename, but this adapter is
 * intentionally single-process. Production applications should implement the
 * FeedbackStore interface with their transactional database.
 */
export class JsonFileStore implements FeedbackStore {
  readonly filePath: string;
  private state?: StoredState;
  private pending: Promise<void> = Promise.resolve();

  constructor(filePath: string) {
    this.filePath = resolve(filePath);
  }

  private async load(): Promise<StoredState> {
    if (this.state) {
      return this.state;
    }

    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<StoredState>;
      if (parsed.version !== 1) {
        throw new Error(`Unsupported feedback store version: ${String(parsed.version)}`);
      }
      this.state = {
        version: 1,
        executions: parsed.executions ?? [],
        signals: parsed.signals ?? [],
        candidates: (parsed.candidates ?? []).map((candidate) => ({
          ...candidate,
          // Candidate risk was added without changing the local store version.
          risk: candidate.risk ?? "medium",
        })),
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
      this.state = emptyState();
    }

    return this.state;
  }

  private async flush(): Promise<void> {
    const state = await this.load();
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    await rename(temporaryPath, this.filePath);
  }

  private async mutate(operation: (state: StoredState) => void): Promise<void> {
    const run = async () => {
      const state = await this.load();
      operation(state);
      await this.flush();
    };
    this.pending = this.pending.then(run, run);
    return this.pending;
  }

  private async read(): Promise<StoredState> {
    await this.pending;
    return this.load();
  }

  async saveExecution(execution: AiExecution): Promise<void> {
    await this.mutate((state) => replaceById(state.executions, execution));
  }

  async getExecution(id: string): Promise<AiExecution | undefined> {
    const execution = (await this.read()).executions.find((item) => item.id === id);
    return execution ? clone(execution) : undefined;
  }

  async listExecutions(options: ExecutionListOptions = {}): Promise<AiExecution[]> {
    return (await this.read()).executions
      .filter(
        (execution) =>
          (!options.namespace || execution.namespace === options.namespace) &&
          timestampInRange(execution.startedAt, options.since, options.until),
      )
      .map(clone);
  }

  async saveSignal(signal: FeedbackSignal): Promise<void> {
    await this.mutate((state) => replaceById(state.signals, signal));
  }

  async listSignals(options: SignalListOptions = {}): Promise<FeedbackSignal[]> {
    return (await this.read()).signals
      .filter(
        (signal) =>
          (!options.namespace || signal.namespace === options.namespace) &&
          timestampInRange(signal.observedAt, options.since, options.until),
      )
      .map(clone);
  }

  async saveCandidate(candidate: AdaptationCandidate): Promise<void> {
    await this.mutate((state) => replaceById(state.candidates, candidate));
  }

  async getCandidate(id: string): Promise<AdaptationCandidate | undefined> {
    const candidate = (await this.read()).candidates.find((item) => item.id === id);
    return candidate ? clone(candidate) : undefined;
  }

  async listCandidates(options: CandidateListOptions = {}): Promise<AdaptationCandidate[]> {
    return (await this.read()).candidates
      .filter(
        (candidate) =>
          (!options.namespace || candidate.namespace === options.namespace) &&
          (!options.targetKey || candidate.target.key === options.targetKey) &&
          (!options.statuses || options.statuses.includes(candidate.status)),
      )
      .map(clone);
  }

  async close(): Promise<void> {
    await this.pending;
  }
}
