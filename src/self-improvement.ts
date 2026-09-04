import { createHash } from "node:crypto";
import type {
  AdaptationCandidate,
  AnalyzeOptions,
  CandidateEvaluator,
  CandidateRisk,
  CandidateTarget,
  CandidateTargetKind,
  EvaluationResult,
  Finding,
  JsonObject,
  JsonValue,
} from "./contracts.js";
import { FeedbackLoop } from "./feedback-loop.js";
import { stableJson } from "./utils.js";

export type AutonomyLevel = "observe" | "recommend" | "experiment" | "apply";

export type MetricComparator = "gte" | "lte" | "gt" | "lt" | "eq";

export interface EvaluationConstraint {
  metric: string;
  comparator: MetricComparator;
  value: number;
}

export interface ImprovementPolicy {
  autonomy: AutonomyLevel;
  allowedTargets: CandidateTargetKind[];
  /** Defaults to low. Only used when autonomy is apply. */
  maxAutomaticRisk?: CandidateRisk;
  /** Caps proposals processed in a single run. Defaults to 10. */
  maximumCandidatesPerRun?: number;
  /** Every constraint must pass before a candidate can be approved. */
  constraints?: EvaluationConstraint[];
  /** Reuse an open candidate and avoid recreating terminal candidates. Defaults to true. */
  deduplicate?: boolean;
}

export interface ImprovementProposal {
  target: CandidateTarget;
  proposedChange: JsonValue;
  risk: CandidateRisk;
  metadata?: JsonObject;
}

export interface ImprovementRecipe {
  name: string;
  matches: (finding: Finding) => boolean | Promise<boolean>;
  propose: (
    finding: Finding,
  ) =>
    | ImprovementProposal
    | ImprovementProposal[]
    | undefined
    | Promise<ImprovementProposal | ImprovementProposal[] | undefined>;
}

export type CandidateDeployer = (
  candidate: AdaptationCandidate,
) => void | Promise<void>;

export interface SelfImprovementRunInput {
  analysis: AnalyzeOptions;
  policy: ImprovementPolicy;
  recipes: ImprovementRecipe[];
  evaluatorName?: string;
  evaluator?: CandidateEvaluator;
  deployer?: CandidateDeployer;
}

export type ImprovementBlockReason =
  | "candidate_budget_reached"
  | "deployment_failed"
  | "duplicate_terminal_candidate"
  | "evaluation_failed"
  | "risk_exceeds_policy"
  | "target_not_allowed";

export interface ImprovementBlock {
  reason: ImprovementBlockReason;
  recipe: string;
  findingId: string;
  candidateId?: string;
  detail?: string;
}

export interface SelfImprovementRunResult {
  autonomy: AutonomyLevel;
  findings: Finding[];
  candidates: AdaptationCandidate[];
  deployed: AdaptationCandidate[];
  blocked: ImprovementBlock[];
}

const riskRank: Record<CandidateRisk, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

function metricPasses(actual: number | undefined, constraint: EvaluationConstraint): boolean {
  if (actual === undefined || !Number.isFinite(actual)) {
    return false;
  }

  switch (constraint.comparator) {
    case "gte":
      return actual >= constraint.value;
    case "lte":
      return actual <= constraint.value;
    case "gt":
      return actual > constraint.value;
    case "lt":
      return actual < constraint.value;
    case "eq":
      return actual === constraint.value;
  }
}

function improvementKey(
  finding: Finding,
  recipe: ImprovementRecipe,
  proposal: ImprovementProposal,
): string {
  const digest = createHash("sha256")
    .update(
      stableJson({
        findingId: finding.id,
        recipe: recipe.name,
        target: {
          kind: proposal.target.kind,
          key: proposal.target.key,
        },
        proposedChange: proposal.proposedChange,
      }),
    )
    .digest("hex")
    .slice(0, 24);
  return `improvement_${digest}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Runs a governed improvement cycle over the FeedbackLoop primitives.
 *
 * Proposal generation, evaluation, and physical deployment remain adapters so
 * applications can use deterministic rules, an LLM, a trainer, a replay
 * harness, or an infrastructure controller without coupling those systems to
 * the framework.
 */
export class SelfImprovementController {
  constructor(readonly loop: FeedbackLoop) {}

  async run(input: SelfImprovementRunInput): Promise<SelfImprovementRunResult> {
    const findings = await this.loop.analyze(input.analysis);
    const result: SelfImprovementRunResult = {
      autonomy: input.policy.autonomy,
      findings,
      candidates: [],
      deployed: [],
      blocked: [],
    };

    if (input.policy.autonomy === "observe") {
      return result;
    }
    if (
      (input.policy.autonomy === "experiment" || input.policy.autonomy === "apply") &&
      !input.evaluator
    ) {
      throw new Error(`${input.policy.autonomy} autonomy requires an evaluator.`);
    }
    if (input.policy.autonomy === "apply" && !input.deployer) {
      throw new Error("apply autonomy requires a deployer.");
    }

    const maximumCandidates = input.policy.maximumCandidatesPerRun ?? 10;
    if (!Number.isInteger(maximumCandidates) || maximumCandidates < 1) {
      throw new Error("maximumCandidatesPerRun must be a positive integer.");
    }

    const evaluatorName = input.evaluatorName?.trim() || "self-improvement";
    const deduplicate = input.policy.deduplicate !== false;
    const processedKeys = new Set<string>();
    let processedCount = 0;

    for (const finding of findings) {
      for (const recipe of input.recipes) {
        if (!(await recipe.matches(finding))) {
          continue;
        }

        const output = await recipe.propose(finding);
        const proposals = output === undefined ? [] : Array.isArray(output) ? output : [output];
        for (const proposal of proposals) {
          if (processedCount >= maximumCandidates) {
            result.blocked.push({
              reason: "candidate_budget_reached",
              recipe: recipe.name,
              findingId: finding.id,
            });
            continue;
          }
          processedCount += 1;

          if (!input.policy.allowedTargets.includes(proposal.target.kind)) {
            result.blocked.push({
              reason: "target_not_allowed",
              recipe: recipe.name,
              findingId: finding.id,
              detail: proposal.target.kind,
            });
            continue;
          }

          const key = improvementKey(finding, recipe, proposal);
          if (processedKeys.has(key)) {
            continue;
          }
          processedKeys.add(key);

          let candidate: AdaptationCandidate | undefined;
          if (deduplicate) {
            const matches = (await this.loop.listCandidates({
              namespace: finding.namespace,
              targetKey: proposal.target.key,
            }))
              .filter(
                (item) =>
                  item.target.kind === proposal.target.kind &&
                  item.metadata.improvementKey === key,
              )
              .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
            const existing = matches[0];
            if (existing && ["deployed", "superseded", "rejected"].includes(existing.status)) {
              result.blocked.push({
                reason: "duplicate_terminal_candidate",
                recipe: recipe.name,
                findingId: finding.id,
                candidateId: existing.id,
                detail: existing.status,
              });
              continue;
            }
            candidate = existing;
          }

          candidate ??= await this.loop.createCandidateFromFinding({
            finding,
            target: proposal.target,
            proposedChange: proposal.proposedChange,
            risk: proposal.risk,
            metadata: {
              ...(proposal.metadata ?? {}),
              improvementKey: key,
              improvementRecipe: recipe.name,
            },
          });

          if (input.policy.autonomy === "recommend") {
            result.candidates.push(candidate);
            continue;
          }

          const evaluator = input.evaluator!;
          candidate = await this.loop.evaluateCandidate(candidate.id, evaluatorName, async (item) => {
            const evaluation = await evaluator(item);
            return this.applyConstraints(evaluation, input.policy.constraints ?? []);
          });
          const latestEvaluation = candidate.evaluations.at(-1);
          if (!latestEvaluation?.passed) {
            result.candidates.push(candidate);
            result.blocked.push({
              reason: "evaluation_failed",
              recipe: recipe.name,
              findingId: finding.id,
              candidateId: candidate.id,
              ...(latestEvaluation?.notes ? { detail: latestEvaluation.notes } : {}),
            });
            continue;
          }

          if (input.policy.autonomy === "experiment") {
            result.candidates.push(candidate);
            continue;
          }

          const maximumRisk = input.policy.maxAutomaticRisk ?? "low";
          if (riskRank[candidate.risk] > riskRank[maximumRisk]) {
            result.candidates.push(candidate);
            result.blocked.push({
              reason: "risk_exceeds_policy",
              recipe: recipe.name,
              findingId: finding.id,
              candidateId: candidate.id,
              detail: `${candidate.risk} > ${maximumRisk}`,
            });
            continue;
          }

          candidate = await this.loop.approveCandidate(candidate.id);
          try {
            await input.deployer!(candidate);
          } catch (error) {
            result.candidates.push(candidate);
            result.blocked.push({
              reason: "deployment_failed",
              recipe: recipe.name,
              findingId: finding.id,
              candidateId: candidate.id,
              detail: errorMessage(error),
            });
            continue;
          }

          candidate = await this.loop.deployCandidate(candidate.id);
          result.candidates.push(candidate);
          result.deployed.push(candidate);
        }
      }
    }

    return result;
  }

  private applyConstraints(
    evaluation: EvaluationResult,
    constraints: EvaluationConstraint[],
  ): EvaluationResult {
    const metrics = evaluation.metrics ?? {};
    const failures = constraints.filter(
      (constraint) => !metricPasses(metrics[constraint.metric], constraint),
    );
    const notes = [
      evaluation.notes,
      ...failures.map(
        (constraint) =>
          `${constraint.metric} must be ${constraint.comparator} ${constraint.value}`,
      ),
    ].filter((note): note is string => Boolean(note));

    return {
      passed: evaluation.passed && failures.length === 0,
      metrics,
      ...(notes.length > 0 ? { notes: notes.join("; ") } : {}),
    };
  }
}
