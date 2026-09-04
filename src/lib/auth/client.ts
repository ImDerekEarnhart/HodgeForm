import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient();
export const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== "false";
export async function signOut(redirectTo = "/login") {
  const { error } = await authClient.signOut();
  if (error) throw new Error(error.message ?? "Sign-out failed");
  window.location.href = redirectTo;
}
