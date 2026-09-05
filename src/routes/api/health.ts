import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/health")({
  server: { handlers: { GET: async () => {
    return Response.json({ status: "ok", release: "1.1.1" });
  } } },
});
