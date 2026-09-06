import { createFileRoute } from "@tanstack/react-router";
import { authenticateApiRequest, requireApiScope } from "@/lib/gate/api-keys.server";
import { acceptVerifierResult, pendingVerifierJobs } from "@/lib/gate/workers.server";
export const Route=createFileRoute("/api/v1/verifier-jobs")({server:{handlers:{
  GET:async({request}:{request:Request})=>{
    const auth=await authenticateApiRequest(request);if(!auth)return Response.json({error:"Unauthorized"},{status:401});
    try{requireApiScope(auth,"evidence:write");return Response.json({jobs:await pendingVerifierJobs(auth.userId,auth.tenantId,auth)});}
    catch(e){return Response.json({error:e instanceof Error?e.message:"Forbidden"},{status:403});}
  },
  POST:async({request}:{request:Request})=>{
    const auth=await authenticateApiRequest(request);if(!auth)return Response.json({error:"Unauthorized"},{status:401});
    try{requireApiScope(auth,"evidence:write");}catch{return Response.json({error:"Forbidden"},{status:403});}
    try{return Response.json(await acceptVerifierResult(auth.userId,auth.tenantId,auth,await request.json()),{status:201});}
    catch(e){return Response.json({error:e instanceof Error?e.message:"Invalid attestation"},{status:400});}
  }
}}});
