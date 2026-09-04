const enabled = process.env.HODGEFORM_EMAIL_PASSWORD_AUTH?.trim().toLowerCase();
export const emailAndPasswordEnabled = enabled === "true" || enabled === "1";
export const signupsAllowed = process.env.HODGEFORM_ALLOW_SIGNUPS?.trim().toLowerCase() === "true";
export const minPasswordLength = Math.max(12, Number(process.env.HODGEFORM_MIN_PASSWORD_LENGTH ?? "12") || 12);
