import type { Risk } from "./types";

export type WorkspaceRole = "owner" | "admin" | "member";

/** Deterministic authorization rule for human release decisions. */
export function roleCanApproveRisk(role: WorkspaceRole, risk: Risk): boolean {
  if (risk === "high" || risk === "critical") return role === "owner" || role === "admin";
  return true;
}

export function canRemoveOrDemoteOwner(targetRole: WorkspaceRole, ownerCount: number): boolean {
  return targetRole !== "owner" || ownerCount > 1;
}
