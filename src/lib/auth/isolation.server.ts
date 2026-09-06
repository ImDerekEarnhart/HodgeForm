import { getRequest } from "@tanstack/react-start/server";
import { sameSiteRequestAllowed } from "./request-provenance";

/**
 * Fetch-Metadata sibling isolation — **server-only** (`.server.ts` suffix).
 *
 * MUST keep the `.server` suffix: this file imports `@tanstack/react-start/server`
 * (`getRequest` → Node `AsyncLocalStorage`). If it is imported from a dual
 * client/server module under a non-`.server` name, Vite ships it to the browser
 * and the app dies with: `AsyncLocalStorage is not a constructor`.
 *
 * Some hosting topologies place mutually untrusted applications beneath the
 * same registrable domain. A `SameSite=Lax` session cookie can be sent on such
 * same-site subrequests, so a sibling application must not be able to ride this
 * app's authenticated server functions with scripted fetch/XHR/form requests.
 *
 * We allow only: same-origin requests (this app's own client), non-browser
 * requests without browser provenance headers (SSR / server-to-server), and
 * top-level GET navigations (how the OAuth callback and normal page loads
 * arrive). Every cross-site / same-site *scripted* request is rejected.
 * An explicit foreign or null Origin is always rejected, even without Fetch Metadata.
 * Together with `__Host-` cookies and Better Auth's `trustedOrigins`, this
 * closes the sibling-tenant attack surface. Enforced at the `authMiddleware`
 * chokepoint (see `middleware.ts`).
 */
export class CrossSiteRequestError extends Error {
  readonly status = 403;
  constructor() {
    super("Forbidden: cross-site request blocked");
    this.name = "CrossSiteRequestError";
  }
}

/** Throw `CrossSiteRequestError` for a scripted cross-site/sibling request. */
export function assertSameSiteRequest(): void {
  const request = getRequest();
  if (!request) return; // no request context (e.g. build) — nothing to guard
  const expectedOrigin = new URL(process.env.BETTER_AUTH_URL?.trim() || request.url).origin;
  if (!sameSiteRequestAllowed(request, expectedOrigin)) throw new CrossSiteRequestError();
}