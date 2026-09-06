import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminMiddleware } from "./middleware";

export const getAdminDashboard = createServerFn({ method: "GET" }).middleware([adminMiddleware]).handler(async ({ context }) => (await import("./service.server")).getAdminDashboard(context.userId));
export const adminInviteMember = createServerFn({ method: "POST" }).middleware([adminMiddleware]).validator((input: unknown) => z.object({ email: z.string().email(), role: z.enum(["admin", "member"]) }).parse(input)).handler(async ({ data, context }) => (await import("./service.server")).adminInvite(context.userId, data.email, data.role));
export const cancelAdminInvite = createServerFn({ method: "POST" }).middleware([adminMiddleware]).validator((input: unknown) => z.object({ inviteId: z.string().min(1).max(120) }).parse(input)).handler(async ({ data, context }) => (await import("./service.server")).cancelAdminInvite(context.userId, data.inviteId));
