import { z } from "zod";
import type { Independence } from "./types";

const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const experimentProtocolSchema = z.object({
  scope: z.string().trim().min(10).max(2000),
  hypotheses: z.array(z.string().trim().min(3).max(1000)).min(2).max(10),
  protocol: z.string().trim().min(20).max(6000),
  developmentDataHash: digest,
  holdoutDataHash: digest,
  antiRescueRules: z.string().trim().min(10).max(2000),
  criteria: z.array(z.object({
    id: z.string().regex(/^[a-zA-Z0-9_.-]{1,40}$/),
    requirementId: z.string().min(1).max(80),
    metric: z.string().regex(/^[a-zA-Z0-9_.-]{1,80}$/),
    comparison: z.enum(["gte", "lte", "eq"]), threshold: z.number().finite(),
  }).strict()).min(1).max(40),
}).strict().refine(p => p.developmentDataHash !== p.holdoutDataHash, "Development and holdout commitments must differ")
  .refine(p => new Set(p.criteria.map(c => c.id)).size === p.criteria.length, "Criterion IDs must be unique");
export type ExperimentProtocol = z.infer<typeof experimentProtocolSchema>;
export type ExperimentEvidence = {
  id: string; requirementId: string; outcome: string; independence: Independence;
  authenticated: boolean; experimentHash: string | null; measurements: Record<string, unknown>;
};
const ranks: Record<Independence, number> = { self: 0, same_team: 1, independent: 2, formal: 3 };

export function evaluateExperiment(protocol: ExperimentProtocol, experimentHash: string, evidence: ExperimentEvidence[], minimum: Record<string, Independence>) {
  const criteria = protocol.criteria.map(c => {
    const assessments = evidence.filter(e => e.requirementId === c.requirementId).map(e => {
      const value = e.measurements[c.metric];
      let reason: string;
      if (e.experimentHash !== experimentHash) reason = "wrong_experiment";
      else if (!e.authenticated) reason = "unauthenticated_execution";
      else if (!minimum[c.requirementId] || !(ranks[e.independence] >= Math.max(1, ranks[minimum[c.requirementId]]))) reason = "insufficient_independence";
      else if (e.outcome === "fail") reason = "refuted";
      else if (e.outcome !== "pass" || typeof value !== "number" || !Number.isFinite(value)) reason = "inconclusive";
      else reason = (c.comparison === "gte" ? value >= c.threshold : c.comparison === "lte" ? value <= c.threshold : value === c.threshold) ? "survived" : "refuted";
      return { evidenceId: e.id, reason, value: typeof value === "number" && Number.isFinite(value) ? value : null };
    });
    return { id: c.id, status: assessments.some(a => a.reason === "refuted") ? "refuted" : assessments.some(a => a.reason === "survived") ? "survived" : "inconclusive", assessments };
  });
  return { status: criteria.some(c => c.status === "refuted") ? "refuted" : criteria.every(c => c.status === "survived") ? "survived" : "inconclusive", criteria, scope: protocol.scope, activationAuthority: false };
}
