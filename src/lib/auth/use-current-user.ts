import { authClient, authEnabled } from "./client";
export type AppUser = { id: string; displayName: string | null; primaryEmail: string | null; isDevFallback: boolean };
export const DEV_USER: AppUser = { id: "dev-user", displayName: "Developer", primaryEmail: "dev@localhost", isDevFallback: true };
export function useCurrentUserState() {
  if (!authEnabled) return { user: DEV_USER, isPending: false };
  const { data, isPending } = authClient.useSession();
  return {
    user: data?.user ? { id: data.user.id, displayName: data.user.name ?? null, primaryEmail: data.user.email ?? null, isDevFallback: false } : null,
    isPending,
  };
}
export function useCurrentUser() { return useCurrentUserState().user; }
