export function adminEmails(value = process.env.HODGEFORM_ADMIN_EMAILS ?? "") {
  return new Set(value.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
}

export function adminEmailAllowed(email: string | null | undefined, configured?: string) {
  return Boolean(email && adminEmails(configured).has(email.trim().toLowerCase()));
}

export function publicTrafficGroup(pathname: string): "landing" | "auth" | "legal" | null {
  if (pathname === "/") return "landing";
  if (["/login", "/verify", "/reset-password", "/accept-invite"].includes(pathname)) return "auth";
  if (["/terms", "/privacy", "/security"].includes(pathname)) return "legal";
  return null;
}
