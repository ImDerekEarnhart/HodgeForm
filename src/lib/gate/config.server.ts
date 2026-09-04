import { releaseKeyConfigured } from "./crypto.server";
import { publicEmailConfigured } from "@/lib/auth/email.server";
export function publicReleaseConfig() {
  const publicRelease = process.env.HODGEFORM_PUBLIC_RELEASE?.trim().toLowerCase() === "true" || process.env.NODE_ENV === "production";
  const issues: string[] = [];
  if (publicRelease) {
    if (process.env.VITE_AUTH_ENABLED === "false") issues.push("authentication is disabled");
    if (!process.env.HODGEFORM_EMAIL_PASSWORD_AUTH?.match(/^(true|1)$/i)) issues.push("email/password auth is disabled");
    if (!process.env.DATABASE_URL?.trim()) issues.push("DATABASE_URL is missing");
    if (!process.env.BETTER_AUTH_SECRET?.trim() || process.env.BETTER_AUTH_SECRET.trim().length < 32) issues.push("BETTER_AUTH_SECRET is missing or too short");
    if (!process.env.BETTER_AUTH_URL?.startsWith("https://")) issues.push("BETTER_AUTH_URL must be https in public release mode");
    if ((process.env.HODGEFORM_DEPLOYMENT_MODE ?? "saas").toLowerCase() === "private" && !process.env.HODGEFORM_PRIVATE_TENANT_ID?.trim()) issues.push("HODGEFORM_PRIVATE_TENANT_ID is required for private deployment mode");
    if (!releaseKeyConfigured()) issues.push("Ed25519 receipt signing keys are missing");
    if ((process.env.HODGEFORM_SANDBOX_SOCKET?.trim() || process.env.HODGEFORM_SANDBOX_URL?.trim()) && (process.env.HODGEFORM_SANDBOX_TOKEN?.trim().length ?? 0) < 24) issues.push("configured executor requires HODGEFORM_SANDBOX_TOKEN with at least 24 characters");
    if (!process.env.HODGEFORM_LEGAL_ENTITY_NAME?.trim()) issues.push("HODGEFORM_LEGAL_ENTITY_NAME is missing");
    if (!process.env.HODGEFORM_SUPPORT_EMAIL?.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) issues.push("HODGEFORM_SUPPORT_EMAIL is missing or invalid");
    if (!process.env.HODGEFORM_SECURITY_EMAIL?.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) issues.push("HODGEFORM_SECURITY_EMAIL is missing or invalid");
    if (!process.env.HODGEFORM_PRIVACY_EMAIL?.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) issues.push("HODGEFORM_PRIVACY_EMAIL is missing or invalid");
    const retentionDays = Number(process.env.HODGEFORM_DATA_RETENTION_DAYS);
    if (!Number.isInteger(retentionDays) || retentionDays < 1) issues.push("HODGEFORM_DATA_RETENTION_DAYS must be a positive integer");
    if (!/^(true|1)$/i.test(process.env.HODGEFORM_LEGAL_REVIEWED ?? "")) issues.push("HODGEFORM_LEGAL_REVIEWED must be explicitly acknowledged before public release");
    if (/^true$/i.test(process.env.HODGEFORM_ALLOW_SIGNUPS ?? "") && !publicEmailConfigured()) issues.push("open signup requires configured transactional email");
  }
  return { publicRelease, ready: issues.length === 0, issues };
}
export function assertPublicReleaseReady() {
  const status = publicReleaseConfig();
  if (status.publicRelease && !status.ready) throw new Error(`Public release configuration is unsafe: ${status.issues.join("; ")}`);
}
