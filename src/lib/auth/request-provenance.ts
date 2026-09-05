/** Validate browser provenance, including clients without Fetch Metadata support. */
export function sameSiteRequestAllowed(request: Request, expectedOrigin: string): boolean {
  const origin = request.headers.get("origin");
  if (origin && origin !== expectedOrigin) return false;
  const site = request.headers.get("sec-fetch-site");
  if (!site || site === "same-origin" || site === "none") return true;
  return request.method === "GET"
    && request.headers.get("sec-fetch-mode") === "navigate"
    && request.headers.get("sec-fetch-dest") === "document";
}
