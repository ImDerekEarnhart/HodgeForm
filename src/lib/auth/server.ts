import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { Pool } from "pg";
import { pgliteDialect } from "./pglite-dialect";
import { getPglite } from "../db";
import { emailAndPasswordEnabled, minPasswordLength, signupsAllowed } from "./email-password";
import { queueAuthEmail } from "./email.server";

const env = (key: string) => process.env[key]?.trim() || undefined;
const authEnabled = env("VITE_AUTH_ENABLED") !== "false";
export const authConfigured = authEnabled && emailAndPasswordEnabled;
const databaseUrl = env("DATABASE_URL");
const baseURL = env("BETTER_AUTH_URL") ?? "http://localhost:8080";
const secret = env("BETTER_AUTH_SECRET") ?? "build-or-dev-placeholder-rejected-by-production-gate-123456";
const production = process.env.NODE_ENV === "production";

const database = databaseUrl
  ? new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: Math.max(250, Number(process.env.HODGEFORM_DB_CONNECT_TIMEOUT_MS ?? "5000") || 5000) })
  : { dialect: pgliteDialect(() => getPglite()), type: "postgres" as const };

export const auth = betterAuth({
  baseURL,
  secret,
  database,
  trustedOrigins: [baseURL, "http://localhost:8080", "http://127.0.0.1:8080"],
  telemetry: { enabled: false },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => queueAuthEmail({ to: user.email, subject: "Verify your HodgeForm account", text: `Verify your email to activate HodgeForm: ${url}` }),
    sendOnSignUp: signupsAllowed,
    sendOnSignIn: signupsAllowed,
    autoSignInAfterVerification: true,
    expiresIn: 3600,
  },
  emailAndPassword: {
    enabled: emailAndPasswordEnabled,
    disableSignUp: !signupsAllowed,
    requireEmailVerification: signupsAllowed,
    minPasswordLength,
    maxPasswordLength: 128,
    autoSignIn: !signupsAllowed,
    sendResetPassword: async ({ user, url }) => queueAuthEmail({ to: user.email, subject: "Reset your HodgeForm password", text: `Reset your HodgeForm password: ${url}` }),
    resetPasswordTokenExpiresIn: 3600,
    revokeSessionsOnPasswordReset: true,
  },
  user: {
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, url }) => queueAuthEmail({ to: user.email, subject: "Confirm HodgeForm account deletion", text: `Confirm permanent deletion of your HodgeForm account: ${url}` }),
      beforeDelete: async (user) => {
        const { getSql } = await import("../db");
        const sql = await getSql();
        const rows = await sql.query<{ workspace_id: string }>(`select m.workspace_id from workspace_members m where m.user_id=$1 and m.role='owner' and 1=(select count(*) from workspace_members o where o.workspace_id=m.workspace_id and o.role='owner') limit 1`, [user.id]);
        if (rows.length) throw new Error("Transfer workspace ownership before deleting the last owner account");
      },
      afterDelete: async (user) => {
        const { getSql } = await import("../db");
        const sql = await getSql();
        await sql.query(`update api_tokens set revoked_at=coalesce(revoked_at,now()) where user_id=$1`, [user.id]);
      },
    },
  },
  // Resetting a password revokes every database session. Do not let a signed
  // cookie cache continue to authorize one of those revoked sessions.
  session: { cookieCache: { enabled: false } },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    storage: "memory",
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 300, max: 5 },
    },
  },
  advanced: {
    // Use explicit __Host- cookie names in production. Browsers reject any
    // __Host- cookie carrying a Domain attribute, which prevents sibling-domain
    // cookie tossing when HodgeForm is hosted beneath a shared registrable domain.
    // Better Auth otherwise uses __Secure-, which still permits Domain=.example.com.
    useSecureCookies: false,
    ipAddress: { ipAddressHeaders: ["x-real-ip"] },
    defaultCookieAttributes: { sameSite: "lax", path: "/", secure: production },
    ...(production
      ? {
          cookies: {
            session_token: { name: "__Host-hodgeform-auth.session_token" },
            session_data: { name: "__Host-hodgeform-auth.session_data" },
            account_data: { name: "__Host-hodgeform-auth.account_data" },
            dont_remember: { name: "__Host-hodgeform-auth.dont_remember" },
          },
        }
      : {}),
  },
  plugins: [tanstackStartCookies()],
});
