import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { publicReleaseConfig } from "@/lib/gate/config.server";
import { readinessStatus } from "@/lib/ops/readiness.server";
import { logEvent, requestId } from "@/lib/ops/log.server";
import { publicPage } from "@/lib/ops/public-pages.server";
import { boundedRequestBody, RequestBodyError } from "@/lib/security/request-body";

function harden(response: Response, id?: string): Response {
  const headers = new Headers(response.headers);
  // Dynamic SSR and API responses can contain session-specific tenant data.
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  if (process.env.NODE_ENV === "production") headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  if (id) headers.set("X-Request-Id", id);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default createServerEntry({
  async fetch(request) {
    const id = requestId(request);
    const started = Date.now();
    const url = new URL(request.url);
    try {
      void import("@/lib/ops/analytics.server").then(({ recordPublicPageView }) => recordPublicPageView(request)).catch((error) => {
        logEvent("warn", "analytics_record_failed", { request_id: id, error: error instanceof Error ? error.message : String(error) });
      });
      const legalPage = publicPage(url.pathname);
      if (legalPage) {
        const response = harden(new Response(legalPage, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }), id);
        logEvent("info", "http_request", { request_id: id, method: request.method, path: url.pathname, status: 200, duration_ms: Date.now() - started });
        return response;
      }
      if (url.pathname === "/api/health") {
        const response = harden(Response.json({ status: "ok", release: "1.1.1" }), id);
        logEvent("info", "http_request", { request_id: id, method: request.method, path: url.pathname, status: 200, duration_ms: Date.now() - started });
        return response;
      }
      if (url.pathname === "/api/ready") {
        const status = await readinessStatus();
        const code = status.ready ? 200 : 503;
        const response = harden(Response.json(status, { status: code }), id);
        logEvent(status.ready ? "info" : "warn", "readiness_check", { request_id: id, status: code, checks: status.checks, issue_count: status.issues.length, duration_ms: Date.now() - started });
        return response;
      }
      const config = publicReleaseConfig();
      if (config.enforced && !config.ready) {
        const response = harden(Response.json({ error: "HodgeForm is refusing traffic because production configuration is unsafe." }, { status: 503 }), id);
        logEvent("error", "unsafe_production_config", { request_id: id, method: request.method, path: url.pathname, issues: config.issues, status: 503, duration_ms: Date.now() - started });
        return response;
      }
      const boundedRequest = await boundedRequestBody(request);
      const response = harden(await handler.fetch(boundedRequest), id);
      logEvent(response.status >= 500 ? "error" : response.status >= 400 ? "warn" : "info", "http_request", { request_id: id, method: request.method, path: url.pathname, status: response.status, duration_ms: Date.now() - started });
      return response;
    } catch (error) {
      if (error instanceof RequestBodyError) {
        logEvent("warn", "http_body_rejected", { request_id: id, status: error.status });
        return harden(Response.json({ error: error.message, requestId: id }, { status: error.status }), id);
      }
      logEvent("error", "http_unhandled_error", { request_id: id, method: request.method, path: url.pathname, duration_ms: Date.now() - started, error: error instanceof Error ? error.message : String(error) });
      return harden(Response.json({ error: "Internal server error", requestId: id }, { status: 500 }), id);
    }
  },
});
