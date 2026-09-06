import { z } from "zod";
import { CAPABILITIES } from "./types";
import { componentsSchema } from "./change-intelligence";

export const candidateSchema = z.object({
  repositoryId: z.string().min(1).max(100), version: z.string().trim().min(1).max(80),
  artifactHash: z.string().regex(/^[a-fA-F0-9]{64}$/),
  manifest: z.object({
    name: z.string().trim().min(1).max(120), framework: z.string().max(80).optional(),
    description: z.string().max(1000).optional(), artifactUri: z.string().max(500).optional(),
    capabilities: z.array(z.enum(CAPABILITIES)).max(30),
    metadata: z.record(z.string().max(100), z.string().max(2000)).optional(),
    components: componentsSchema.optional(),
  }).strict(),
  intent: z.object({
    pack: z.enum(["basic", "networked", "code-execution", "action-taking", "high-risk"]),
    dataClass: z.enum(["public", "internal", "confidential", "regulated"]), separateApprover: z.boolean().optional(),
  }).strict(),
}).strict();
