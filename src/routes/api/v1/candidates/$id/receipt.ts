import { createFileRoute } from "@tanstack/react-router";
import { authenticateApiRequest, requireApiScope } from "@/lib/gate/api-keys.server";
import { getReceiptForCandidate } from "@/lib/gate/service.server";

export const Route = createFileRoute("/api/v1/candidates/$id/receipt")({
  server: { handlers: {
    GET: async ({ request, params }: { request: Request; params: { id: string } }) => {
      const auth = await authenticateApiRequest(request);
      if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401, headers: { "www-authenticate": "Bearer" } });
      try { requireApiScope(auth, "receipt:read"); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Forbidden" }, { status: 403 }); }
      try {
        return Response.json(await getReceiptForCandidate(auth.userId, params.id, auth.tenantId));
      } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : "Receipt not found" }, { status: 404 });
      }
    },
  } },
});
