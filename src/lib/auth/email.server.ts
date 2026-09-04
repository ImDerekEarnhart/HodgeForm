const env = (key: string) => process.env[key]?.trim() || undefined;

export function publicEmailConfigured() {
  return env("HODGEFORM_EMAIL_PROVIDER") === "resend" && Boolean(env("RESEND_API_KEY") && env("HODGEFORM_EMAIL_FROM"));
}

export async function sendAuthEmail(input: { to: string; subject: string; text: string }) {
  const captureFile = env("HODGEFORM_EMAIL_CAPTURE_FILE");
  if (process.env.NODE_ENV === "test" && captureFile) {
    const { appendFile } = await import("node:fs/promises");
    await appendFile(captureFile, `${JSON.stringify({ ...input, capturedAt: new Date().toISOString() })}\n`, { mode: 0o600 });
    return;
  }
  const provider = env("HODGEFORM_EMAIL_PROVIDER");
  if (provider !== "resend") {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[HodgeForm auth email] to=${input.to} subject=${input.subject}\n${input.text}`);
      return;
    }
    throw new Error("Transactional email is not configured");
  }
  const apiKey = env("RESEND_API_KEY");
  const from = env("HODGEFORM_EMAIL_FROM");
  if (!apiKey || !from) throw new Error("RESEND_API_KEY and HODGEFORM_EMAIL_FROM are required");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [input.to], subject: input.subject, text: input.text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Auth email provider rejected request (${response.status})`);
}

export function queueAuthEmail(input: { to: string; subject: string; text: string }) {
  void sendAuthEmail(input).catch((error) => console.error("HodgeForm auth email delivery failed", error));
}
