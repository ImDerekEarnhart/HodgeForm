import type { ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { useCurrentUserState } from "./use-current-user";
export const SIGN_IN_PATH = "/login";
export function RequireUser({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <div className="p-8 text-sm text-muted">Checking session…</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}
