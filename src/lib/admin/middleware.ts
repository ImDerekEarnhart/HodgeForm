import { createMiddleware } from "@tanstack/react-start";

export class AdminAccessError extends Error {
  readonly status = 403;
  constructor() {
    super("Platform administrator access required");
    this.name = "AdminAccessError";
  }
}

export const adminMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
  const { getSessionUser, DEV_USER_ID } = await import("@/lib/auth/verify.server");
  const { adminEmailAllowed, adminEmails } = await import("./policy");
  assertSameSiteRequest();
  const user = await getSessionUser();
  const developmentFallback = process.env.NODE_ENV !== "production" && adminEmails().size === 0;
  if (!user && developmentFallback) return next({ context: { userId: DEV_USER_ID, adminEmail: "dev@localhost" } });
  if (!user || !adminEmailAllowed(user.email)) throw new AdminAccessError();
  return next({ context: { userId: user.id, adminEmail: user.email! } });
});
