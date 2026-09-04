import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { CAPABILITIES } from "./types";

const repoSchema = z.object({ name: z.string().min(1).max(100), description: z.string().max(500).optional() });
const intentSchema = z.object({
  pack: z.enum(["basic", "networked", "code-execution", "action-taking", "high-risk"]),
  dataClass: z.enum(["public", "internal", "confidential", "regulated"]),
  separateApprover: z.boolean().optional(),
});
const manifestSchema = z.object({
  name: z.string().min(1).max(120), framework: z.string().max(80).optional(), description: z.string().max(1000).optional(), artifactUri: z.string().max(500).optional(),
  capabilities: z.array(z.enum(CAPABILITIES)).max(30), metadata: z.record(z.string(), z.string()).optional(),
});

export const getOverview = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => (await import("./service.server")).getOverview(context.userId));
export const listRepositories = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => (await import("./service.server")).listRepositories(context.userId));
export const listCandidates = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((input: { repositoryId?: string } = {}) => ({ repositoryId: input?.repositoryId?.slice(0, 100) })).handler(async ({ data, context }) => (await import("./service.server")).listCandidates(context.userId, data.repositoryId));
export const listReceipts = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => (await import("./service.server")).listReceipts(context.userId));
export const listDiscoveries = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => (await import("./service.server")).listDiscoveries(context.userId));

export const createRepository = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input: unknown) => repoSchema.parse(input)).handler(async ({ data, context }) => (await import("./service.server")).createRepository(context.userId, data));

export const createCandidate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ repositoryId: z.string().min(1).max(100), version: z.string().min(1).max(80), artifactHash: z.string().regex(/^[a-fA-F0-9]{64}$/), manifest: manifestSchema, intent: intentSchema }).parse(input))
  .handler(async ({ data, context }) => (await import("./service.server")).createCandidate(context.userId, data));

export const proposeAdversarialChecks = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input: unknown) => z.object({ candidateId: z.string().min(1).max(100) }).parse(input)).handler(async ({ data, context }) => (await import("./service.server")).proposeAdversarialChecks(context.userId, data.candidateId));

export const getCandidate = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((input: unknown) => z.object({ candidateId: z.string().min(1).max(100) }).parse(input)).handler(async ({ data, context }) => (await import("./service.server")).getCandidate(context.userId, data.candidateId));

export const recordEvidence = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({
    candidateId: z.string().min(1).max(100), requirementId: z.string().min(1).max(80),
    evidenceKind: z.enum(["deterministic_test", "sandbox_run", "static_analysis", "llm_evaluation", "independent_verifier", "formal_proof", "human_approval"]),
    outcome: z.enum(["pass", "fail", "inconclusive"]),
    source: z.string().min(1).max(160), payload: z.record(z.string(), z.unknown()).default({}),
  }).parse(input))
  .handler(async ({ data, context }) => (await import("./service.server")).recordEvidence(context.userId, data.candidateId, data));

export const decideRelease = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ candidateId: z.string().min(1).max(100), expectedPolicyHash: z.string().regex(/^[a-fA-F0-9]{64}$/), confirmation: z.string().max(100) }).parse(input))
  .handler(async ({ data, context }) => (await import("./service.server")).decideRelease(context.userId, data.candidateId, data.expectedPolicyHash, data.confirmation));

export const createDiscovery = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ repositoryId: z.string().min(1).max(100), parentId: z.string().max(100).optional(), branch: z.string().min(1).max(80), title: z.string().min(1).max(160), claim: z.string().min(1).max(6000), evidenceRefs: z.array(z.string().max(100)).max(100).optional() }).parse(input))
  .handler(async ({ data, context }) => (await import("./service.server")).createDiscovery(context.userId, data));

export const createApiToken = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input: unknown) => z.object({ name: z.string().min(1).max(80), verifierPrincipalId: z.string().min(1).max(120).optional(), scopes: z.array(z.enum(["repository:read","repository:write","candidate:read","candidate:write","evidence:write","receipt:read"])).min(1).max(12).optional() }).parse(input)).handler(async ({ data, context }) => (await import("./api-keys.server")).createApiToken(context.userId, data.name, { verifierPrincipalId: data.verifierPrincipalId, scopes: data.scopes }));
export const listApiTokens = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => (await import("./api-keys.server")).listApiTokens(context.userId));
export const revokeApiToken = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input: unknown) => z.object({ tokenId: z.string().min(1).max(100) }).parse(input)).handler(async ({ data, context }) => (await import("./api-keys.server")).revokeApiToken(context.userId, data.tokenId));

export const listVerifierPrincipals = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => (await import("./verifiers.server")).listVerifierPrincipals(context.userId));
export const registerVerifierPrincipal = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input: unknown) => z.object({ name: z.string().min(1).max(100), trustLevel: z.enum(["same_team","independent"]), allowedEvidenceKinds: z.array(z.enum(["deterministic_test","sandbox_run","static_analysis","llm_evaluation","independent_verifier"])).min(1).max(10) }).parse(input)).handler(async ({ data, context }) => (await import("./verifiers.server")).registerVerifierPrincipal(context.userId, data));
export const disableVerifierPrincipal = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input: unknown) => z.object({ verifierId: z.string().min(1).max(120) }).parse(input)).handler(async ({ data, context }) => (await import("./verifiers.server")).disableVerifierPrincipal(context.userId, data.verifierId));

export const listWorkspaces = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => (await import("./tenant.server")).listWorkspaces(context.userId));
export const listWorkspaceMembers = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => (await import("./tenant.server")).listWorkspaceMembers(context.userId));
export const createWorkspace = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input: unknown) => z.object({ name: z.string().min(1).max(100) }).parse(input)).handler(async ({ data, context }) => (await import("./tenant.server")).createWorkspaceForUser(context.userId, data.name));
export const switchWorkspace = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input: unknown) => z.object({ workspaceId: z.string().min(1).max(100) }).parse(input)).handler(async ({ data, context }) => (await import("./tenant.server")).switchWorkspace(context.userId, data.workspaceId));
export const inviteWorkspaceMember = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input: unknown) => z.object({ email: z.string().email(), role: z.enum(["admin","member"]).default("member") }).parse(input)).handler(async ({ data, context }) => (await import("./tenant.server")).inviteWorkspaceMember(context.userId, data.email, data.role));
export const acceptWorkspaceInvite = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input: unknown) => z.object({ token: z.string().min(20).max(200) }).parse(input)).handler(async ({ data, context }) => (await import("./tenant.server")).acceptWorkspaceInvite(context.userId, data.token));

export const setWorkspaceMemberRole = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input: unknown) => z.object({ userId: z.string().min(1).max(160), role: z.enum(["owner","admin","member"]) }).parse(input)).handler(async ({ data, context }) => (await import("./tenant.server")).setWorkspaceMemberRole(context.userId, data.userId, data.role));
export const removeWorkspaceMember = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input: unknown) => z.object({ userId: z.string().min(1).max(160) }).parse(input)).handler(async ({ data, context }) => (await import("./tenant.server")).removeWorkspaceMember(context.userId, data.userId));

export const verifyPublishedReceipt = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({
    schema: z.literal("hodgeform-signed-release/1"),
    payload: z.record(z.string(), z.unknown()),
    receiptHash: z.string().regex(/^[a-fA-F0-9]{64}$/),
    signerId: z.string().min(1).max(200).optional(),
    signature: z.string().min(20).max(2000),
    publicKeyFingerprint: z.string().regex(/^[a-fA-F0-9]{64}$/),
    canonicalPayload: z.string().max(200000).optional(),
  }).parse(input))
  .handler(async ({ data }) => (await import("./crypto.server")).verifySignedReceiptDocument(data));
