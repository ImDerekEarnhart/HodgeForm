import { createFileRoute } from "@tanstack/react-router";
import { authenticateApiRequest, requireApiScope } from "@/lib/gate/api-keys.server";
import { getCandidate } from "@/lib/gate/service.server";
export const Route = createFileRoute("/api/v1/candidates/$id")({ server:{ handlers:{ GET:async({request,params}:{request:Request;params:{id:string}})=>{const a=await authenticateApiRequest(request);if(!a)return Response.json({error:"Unauthorized"},{status:401});try{requireApiScope(a,"candidate:read")}catch(e){return Response.json({error:e instanceof Error?e.message:"Forbidden"},{status:403})}try{return Response.json(await getCandidate(a.userId,params.id,a.tenantId));}catch(e){return Response.json({error:e instanceof Error?e.message:"Not found"},{status:404});}} } } });
