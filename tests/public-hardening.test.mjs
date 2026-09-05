import test from "node:test";
import assert from "node:assert/strict";
import { trustedAuthOrigins } from "../src/lib/auth/trusted-origins.ts";
import { enforceAgentRateLimit, RateLimitError } from "../src/lib/security/rate-limit.server.ts";

test("production trusts only the configured authentication origin", () => {
  assert.deepEqual(trustedAuthOrigins("https://app.example.com/auth", true), ["https://app.example.com"]);
  assert.deepEqual(trustedAuthOrigins("https://app.example.com", false), [
    "https://app.example.com", "http://localhost:8080", "http://127.0.0.1:8080",
  ]);
});

test("limiter bounds unique accounts, preserves quotas, and reclaims expired entries", () => {
  const originalNow = Date.now;
  const originalLimit = process.env.HODGEFORM_AGENT_REQUESTS_PER_MINUTE;
  let now = 1_000_000;
  Date.now = () => now;
  process.env.HODGEFORM_AGENT_REQUESTS_PER_MINUTE = "1";
  try {
    for (let i = 0; i < 10_000; i++) enforceAgentRateLimit(`account-${i}`);
    assert.throws(() => enforceAgentRateLimit("overflow"), RateLimitError);
    assert.throws(() => enforceAgentRateLimit("account-0"), RateLimitError);
    now += 60_000;
    assert.doesNotThrow(() => enforceAgentRateLimit("overflow"));
    assert.doesNotThrow(() => enforceAgentRateLimit("account-0"));
    assert.throws(() => enforceAgentRateLimit("account-0"), RateLimitError);
  } finally {
    Date.now = originalNow;
    if (originalLimit === undefined) delete process.env.HODGEFORM_AGENT_REQUESTS_PER_MINUTE;
    else process.env.HODGEFORM_AGENT_REQUESTS_PER_MINUTE = originalLimit;
  }
});

import { sameSiteRequestAllowed } from "../src/lib/auth/request-provenance.ts";

test("CSRF protection rejects foreign and null origins without Fetch Metadata", () => {
  const origin = "https://hodgeform.com";
  for (const claimedOrigin of ["https://evil.example", "https://sibling.hodgeform.com", "null"]) {
    assert.equal(sameSiteRequestAllowed(new Request(origin, {
      method: "POST", headers: { origin: claimedOrigin },
    }), origin), false);
  }
  assert.equal(sameSiteRequestAllowed(new Request(origin, {
    method: "POST", headers: { origin },
  }), origin), true);
  assert.equal(sameSiteRequestAllowed(new Request(origin, {
    method: "POST", headers: { origin: "https://evil.example", "sec-fetch-site": "same-origin" },
  }), origin), false);
  assert.equal(sameSiteRequestAllowed(new Request(origin, {
    headers: { "sec-fetch-site": "cross-site", "sec-fetch-mode": "navigate", "sec-fetch-dest": "document" },
  }), origin), true);
  assert.equal(sameSiteRequestAllowed(new Request(origin, {
    method: "POST", headers: { "sec-fetch-site": "same-site" },
  }), origin), false);
});
