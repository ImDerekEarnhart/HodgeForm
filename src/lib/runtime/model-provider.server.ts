/**
 * Local-first model provider.
 *
 * The app speaks one OpenAI-compatible HTTP shape so Ollama, llama.cpp and
 * vLLM can be used without changing orchestration code. Paid xAI fallback is
 * deliberately opt-in.
 */

const DEFAULT_LOCAL_BASE_URL = "http://127.0.0.1:11434/v1";
const XAI_BASE_URL = "https://api.x.ai/v1";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatResult =
  | { ok: true; text: string; model: string; provider: string }
  | { ok: false; error: string; provider: string };

type Role = "student" | "teacher";

type Target = {
  provider: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
};

function env(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

function boolEnv(key: string, fallback = false): boolean {
  const value = env(key)?.toLowerCase();
  if (!value) return fallback;
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Model base URL must use http or https");
  }
  return url.toString().replace(/\/+$/, "");
}

function localTarget(role: Role): Target | null {
  const prefix = role === "student" ? "HODGEFORM_STUDENT" : "HODGEFORM_TEACHER";
  const sharedModel = env("HODGEFORM_MODEL");
  const model = env(`${prefix}_MODEL`) ?? sharedModel;
  if (!model) return null;

  const baseUrl = normalizeBaseUrl(
    env(`${prefix}_BASE_URL`) ?? env("HODGEFORM_MODEL_BASE_URL") ?? DEFAULT_LOCAL_BASE_URL,
  );
  const apiKey = env(`${prefix}_API_KEY`) ?? env("HODGEFORM_MODEL_API_KEY");
  return {
    provider: new URL(baseUrl).hostname === "127.0.0.1" || new URL(baseUrl).hostname === "localhost"
      ? "local-openai-compatible"
      : "openai-compatible",
    baseUrl,
    apiKey,
    model,
  };
}

function paidFallbackTarget(role: Role): Target | null {
  if (!boolEnv("HODGEFORM_ALLOW_XAI_FALLBACK", false)) return null;
  const apiKey = env("XAI_API_KEY");
  if (!apiKey) return null;
  return {
    provider: "xai-fallback",
    baseUrl: XAI_BASE_URL,
    apiKey,
    model:
      role === "student"
        ? env("HODGEFORM_XAI_STUDENT_MODEL") ?? "grok-4.5"
        : env("HODGEFORM_XAI_TEACHER_MODEL") ?? "grok-4.5",
  };
}

function roleTargets(role: Role): Target[] {
  return [localTarget(role), paidFallbackTarget(role)].filter((x): x is Target => Boolean(x));
}

async function postChat(
  target: Target,
  messages: ChatMessage[],
  opts: { maxTokens: number; temperature: number; json?: boolean },
): Promise<ChatResult> {
  const controller = new AbortController();
  const timeoutMs = Number(env("HODGEFORM_MODEL_TIMEOUT_MS") ?? "45000");
  const timer = setTimeout(() => controller.abort(), Math.max(1000, Math.min(timeoutMs, 120000)));

  const body: Record<string, unknown> = {
    model: target.model,
    messages,
    max_tokens: opts.maxTokens,
    temperature: opts.temperature,
  };
  if (opts.json) body.response_format = { type: "json_object" };

  try {
    const res = await fetch(`${target.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(target.apiKey ? { Authorization: `Bearer ${target.apiKey}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        provider: target.provider,
        error: `Model endpoint returned ${res.status}${text ? `: ${text.slice(0, 160)}` : ""}`,
      };
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      model?: string;
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    if (!text.trim()) {
      return { ok: false, provider: target.provider, error: "Model endpoint returned an empty response" };
    }
    return {
      ok: true,
      text,
      model: data.model ?? target.model,
      provider: target.provider,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "model request failed";
    return { ok: false, provider: target.provider, error: message };
  } finally {
    clearTimeout(timer);
  }
}

async function chat(
  role: Role,
  messages: ChatMessage[],
  opts: { maxTokens: number; temperature: number; json?: boolean },
): Promise<ChatResult> {
  const targets = roleTargets(role);
  if (!targets.length) {
    return {
      ok: false,
      provider: "none",
      error: `No ${role} model configured. Set HODGEFORM_${role.toUpperCase()}_MODEL (or HODGEFORM_MODEL).`,
    };
  }

  let last: ChatResult = { ok: false, provider: "none", error: "No model attempted" };
  for (const target of targets) {
    last = await postChat(target, messages, opts);
    if (last.ok) return last;
  }
  return last;
}

export function aiAvailable(): boolean {
  return roleTargets("student").length > 0 || roleTargets("teacher").length > 0;
}

export function providerStatus() {
  const student = localTarget("student") ?? paidFallbackTarget("student");
  const teacher = localTarget("teacher") ?? paidFallbackTarget("teacher");
  return {
    student: student ? `${student.model} · ${student.provider}` : "not configured",
    teacher: teacher ? `${teacher.model} · ${teacher.provider}` : "not configured",
    paidFallbackEnabled: boolEnv("HODGEFORM_ALLOW_XAI_FALLBACK", false),
  };
}

export function studentChat(messages: ChatMessage[], opts?: { maxTokens?: number }) {
  return chat("student", messages, {
    maxTokens: opts?.maxTokens ?? 500,
    temperature: 0.2,
    json: true,
  });
}

export function teacherChat(
  messages: ChatMessage[],
  opts?: { maxTokens?: number; json?: boolean },
) {
  return chat("teacher", messages, {
    maxTokens: opts?.maxTokens ?? 900,
    temperature: 0.3,
    json: opts?.json ?? true,
  });
}
