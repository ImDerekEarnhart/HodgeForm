import { releaseKeyConfigured } from "./crypto.server";
import { publicEmailConfigured } from "@/lib/auth/email.server";

export type ReleaseChannel = "development" | "controlled_beta" | "public_ga";

function releaseChannel(): { channel: ReleaseChannel; issue?: string } {
  const configured = process.env.HODGEFORM_RELEASE_CHANNEL?.trim().toLowerCase().replaceAll("-", "_");
  if (configured === "development" || configured === "controlled_beta" || configured === "public_ga") return { channel: configured };
  if (configured) {
    return {
      channel: "public_ga",
      issue: "HODGEFORM_RELEASE_CHANNEL must be development, controlled_beta, or public_ga",
    };
  }
  if (/^(true|1)$/i.test(process.env.HODGEFORM_PUBLIC_RELEASE ?? "")) return { channel: "public_ga" };
  return { channel: process.env.NODE_ENV === "production" ? "controlled_beta" : "development" };
}

export function publicReleaseConfig() {
  const resolvedChannel = releaseChannel();
  const channel = resolvedChannel.channel;
  // NODE_ENV selects the safe default channel above; the explicit channel is the
  // policy authority so isolated development/test servers can opt out deliberately.
  const enforced = channel !== "development";
  const publicRelease = channel === "public_ga";
  const issues: string[] = [];
  if (resolvedChannel.issue) issues.push(resolvedChannel.issue);
  if (enforced) {
    if (process.env.VITE_AUTH_ENABLED === "false") issues.push("authentication is disabled");
    if (!process.env.HODGEFORM_EMAIL_PASSWORD_AUTH?.match(/^(true|1)$/i)) issues.push("email/password auth is disabled");
    if (!process.env.DATABASE_URL?.trim()) issues.push("DATABASE_URL is missing");
    if (!process.env.BETTER_AUTH_SECRET?.trim() || process.env.BETTER_AUTH_SECRET.trim().length < 32) issues.push("BETTER_AUTH_SECRET is missing or too short");
    if (!process.env.BETTER_AUTH_URL?.startsWith("https://")) issues.push("BETTER_AUTH_URL must be https in production release mode");
    if ((process.env.HODGEFORM_DEPLOYMENT_MODE ?? "saas").toLowerCase() === "private" && !process.env.HODGEFORM_PRIVATE_TENANT_ID?.trim()) issues.push("HODGEFORM_PRIVATE_TENANT_ID is required for private deployment mode");
    if (!releaseKeyConfigured()) issues.push("Ed25519 receipt signing keys are missing");
    if ((process.env.HODGEFORM_SANDBOX_SOCKET?.trim() || process.env.HODGEFORM_SANDBOX_URL?.trim()) && (process.env.HODGEFORM_SANDBOX_TOKEN?.trim().length ?? 0) < 24) issues.push("configured executor requires HODGEFORM_SANDBOX_TOKEN with at least 24 characters");
    if (!process.env.HODGEFORM_LEGAL_ENTITY_NAME?.trim()) issues.push("HODGEFORM_LEGAL_ENTITY_NAME is missing");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(process.env.HODGEFORM_LEGAL_EFFECTIVE_DATE ?? "")) issues.push("HODGEFORM_LEGAL_EFFECTIVE_DATE must be YYYY-MM-DD");
    if (!process.env.HODGEFORM_SUPPORT_EMAIL?.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) issues.push("HODGEFORM_SUPPORT_EMAIL is missing or invalid");
    if (!process.env.HODGEFORM_SECURITY_EMAIL?.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) issues.push("HODGEFORM_SECURITY_EMAIL is missing or invalid");
    if (!process.env.HODGEFORM_PRIVACY_EMAIL?.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) issues.push("HODGEFORM_PRIVACY_EMAIL is missing or invalid");
    const adminEmails = (process.env.HODGEFORM_ADMIN_EMAILS ?? "").split(",").map((email) => email.trim()).filter(Boolean);
    if (!adminEmails.length || adminEmails.some((email) => !email.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/))) issues.push("HODGEFORM_ADMIN_EMAILS must contain at least one valid administrator email");
    const retentionDays = Number(process.env.HODGEFORM_DATA_RETENTION_DAYS);
    if (!Number.isInteger(retentionDays) || retentionDays < 1) issues.push("HODGEFORM_DATA_RETENTION_DAYS must be a positive integer");
    const signups = /^(true|1)$/i.test(process.env.HODGEFORM_ALLOW_SIGNUPS ?? "");
    if (channel === "controlled_beta" && signups) issues.push("controlled beta must keep HODGEFORM_ALLOW_SIGNUPS=false");
    if (channel === "public_ga" && !/^(true|1)$/i.test(process.env.HODGEFORM_LEGAL_REVIEWED ?? "")) issues.push("HODGEFORM_LEGAL_REVIEWED must be explicitly acknowledged before public GA");
    if (signups && !publicEmailConfigured()) issues.push("open signup requires configured transactional email");
  }
  return { channel, enforced, publicRelease, ready: issues.length === 0, issues };
}
export function assertPublicReleaseReady() {
  const status = publicReleaseConfig();
  if (status.enforced && !status.ready) throw new Error(`HodgeForm deployment configuration is unsafe: ${status.issues.join("; ")}`);
}
