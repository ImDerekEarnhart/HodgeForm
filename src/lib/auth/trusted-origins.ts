export function trustedAuthOrigins(baseURL: string, production: boolean): string[] {
  const origin = new URL(baseURL).origin;
  return production
    ? [origin]
    : [...new Set([origin, "http://localhost:8080", "http://127.0.0.1:8080"])];
}
