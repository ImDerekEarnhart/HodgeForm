import { createFileRoute } from "@tanstack/react-router";
import { authenticateApiRequest, requireApiScope } from "@/lib/gate/api-keys.server";
import { getSql } from "@/lib/db";
import { createCandidate, listCandidates } from "@/lib/gate/service.server";
function unauthorized(){return Response.json({error:"Unauthorized"},{status:401,headers:{"www-authenticate":"Bearer"}})}
function forbidden(error:unknown){return Response.json({error:error instanceof Error?error.message:"Forbidden"},{status:403})}
export const Route = createFileRoute("/api/v1/candidates")({ server:{ handlers:{
  GET: async ({request}:{request:Request})=>{const a=await authenticateApiRequest(request);if(!a)return unauthorized();try{requireApiScope(a,"candidate:read")}catch(e){return forbidden(e)}return Response.json({candidates:await listCandidates(a.userId,undefined,a.tenantId)});},
  POST: async ({request}:{request:Request})=>{const a=await authenticateApiRequest(request);if(!a)return unauthorized();try{requireApiScope(a,"candidate:write")}catch(e){return forbidden(e)}try{const body=await request.json() as any;let repositoryId=String(body.repositoryId??"");if(!repositoryId&&body.repositorySlug){const sql=await getSql();const [r]=await sql.query<{id:string}>("select id from repositories where tenant_id=$1 and slug=$2",[a.tenantId,String(body.repositorySlug)]);repositoryId=r?.id??"";}if(!repositoryId)throw new Error("repositoryId or repositorySlug is required");const result=await createCandidate(a.userId,{repositoryId,version:String(body.version??""),artifactHash:String(body.artifactHash??""),manifest:body.manifest,intent:body.intent},a.tenantId);return Response.json(result,{status:201});}catch(e){return Response.json({error:e instanceof Error?e.message:"Invalid request"},{status:400});}}
} } });
