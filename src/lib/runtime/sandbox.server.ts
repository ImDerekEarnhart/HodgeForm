/**
 * Sandbox client.
 *
 * SECURITY BOUNDARY: arbitrary Python is never spawned by the web process.
 * Prefer HODGEFORM_SANDBOX_SOCKET and run the executor container with no network.
 * HODGEFORM_SANDBOX_URL exists for a separately isolated remote executor.
 * Without either, only a narrow arithmetic fallback is available.
 */

function env(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

function arithmeticFallback(code: string): { ok: boolean; output: string } {
  const expr = code.replace(/^\s*print\((.*)\)\s*$/s, "$1").trim();
  if (!expr || expr.length > 500 || !/^[0-9+\-*/().\s]+$/.test(expr)) {
    return {
      ok: false,
      output: "SandboxUnavailable: isolated executor is not configured; only arithmetic expressions are allowed locally.",
    };
  }
  try {
    const value = Function(`"use strict"; return (${expr});`)();
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return { ok: false, output: "Arithmetic result is not a finite number." };
    }
    return { ok: true, output: String(value) };
  } catch (error) {
    return { ok: false, output: error instanceof Error ? error.message : "Arithmetic evaluation failed" };
  }
}

async function postUnixSocket(
  socketPath: string,
  payload: string,
): Promise<{ status: number; text: string }> {
  const { request } = await import("node:http");
  return new Promise((resolve, reject) => {
    const req = request(
      {
        socketPath,
        path: "/execute",
        method: "POST",
        timeout: 4_000,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          ...(env("HODGEFORM_SANDBOX_TOKEN")
            ? { Authorization: `Bearer ${env("HODGEFORM_SANDBOX_TOKEN")}` }
            : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 500, text: Buffer.concat(chunks).toString("utf8") }),
        );
      },
    );
    req.on("timeout", () => req.destroy(new Error("sandbox request timed out")));
    req.on("error", reject);
    req.end(payload);
  });
}

async function runIsolated(code: string): Promise<{ ok: boolean; output: string }> {
  const socketPath = env("HODGEFORM_SANDBOX_SOCKET");
  const rawUrl = env("HODGEFORM_SANDBOX_URL");
  if (!socketPath && !rawUrl) return arithmeticFallback(code);

  const payload = JSON.stringify({ language: "python", code: code.slice(0, 3500) });
  try {
    let status: number;
    let text: string;
    if (socketPath) {
      ({ status, text } = await postUnixSocket(socketPath, payload));
    } else {
      const url = new URL(rawUrl!);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return { ok: false, output: "SandboxMisconfigured: URL must use http or https." };
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4_000);
      try {
        const res = await fetch(new URL("/execute", url), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(env("HODGEFORM_SANDBOX_TOKEN")
              ? { Authorization: `Bearer ${env("HODGEFORM_SANDBOX_TOKEN")}` }
              : {}),
          },
          body: payload,
          signal: controller.signal,
        });
        status = res.status;
        text = await res.text();
      } finally {
        clearTimeout(timer);
      }
    }

    const data = JSON.parse(text) as { ok?: boolean; output?: string; error?: string };
    if (status < 200 || status >= 300) {
      return { ok: false, output: `Sandbox executor returned ${status}` };
    }
    return {
      ok: data.ok === true,
      output: String(data.output ?? data.error ?? "").slice(0, 6000),
    };
  } catch (error) {
    return {
      ok: false,
      output: `SandboxUnavailable: ${error instanceof Error ? error.message : "request failed"}`,
    };
  }
}

export async function runSandbox(code: string): Promise<{ ok: boolean; output: string }> {
  if (!code.trim()) return { ok: false, output: "Missing code" };
  if (code.length > 3500) return { ok: false, output: "Code exceeds sandbox limit." };
  return runIsolated(code);
}
