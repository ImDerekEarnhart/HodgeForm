import { createFileRoute } from "@tanstack/react-router";
import { publicReleaseConfig } from "@/lib/gate/config.server";
export const Route = createFileRoute("/api/health")({
  server: { handlers: { GET: async () => {
    const c = publicReleaseConfig();
    return Response.json({ status: c.ready || !c.publicRelease ? "ok" : "not_ready", release: "1.1.0" }, { status: c.ready || !c.publicRelease ? 200 : 503 });
  } } },
});
