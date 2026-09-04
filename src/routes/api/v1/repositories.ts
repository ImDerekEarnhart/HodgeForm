import { createFileRoute } from "@tanstack/react-router";
import { authenticateApiRequest, requireApiScope } from "@/lib/gate/api-keys.server";
import { createRepository, listRepositories } from "@/lib/gate/service.server";

function unauthorized() { return Response.json({ error: "Unauthorized" }, { status: 401, headers: { "www-authenticate": "Bearer" } }); }
function forbidden(error: unknown) { return Response.json({ error: error instanceof Error ? error.message : "Forbidden" }, { status: 403 }); }

export const Route = createFileRoute("/api/v1/repositories")({ server: { handlers: {
  GET: async ({ request }: { request: Request }) => {
    const auth = await authenticateApiRequest(request); if (!auth) return unauthorized();
    try { requireApiScope(auth, "repository:read"); } catch (error) { return forbidden(error); }
    return Response.json({ repositories: await listRepositories(auth.userId, auth.tenantId) });
  },
  POST: async ({ request }: { request: Request }) => {
    const auth = await authenticateApiRequest(request); if (!auth) return unauthorized();
    try { requireApiScope(auth, "repository:write"); } catch (error) { return forbidden(error); }
    try {
      const body = await request.json() as { name?: unknown; description?: unknown };
      const repository = await createRepository(auth.userId, { name: String(body.name ?? ""), description: body.description == null ? undefined : String(body.description) }, auth.tenantId);
      return Response.json(repository, { status: 201 });
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
    }
  },
} } });
