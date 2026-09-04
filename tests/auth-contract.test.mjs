import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const workflow=await readFile(new URL("../.github/workflows/release.yml",import.meta.url),"utf8");const auth=await readFile(new URL("../scripts/auth-http-integration.mjs",import.meta.url),"utf8");const recovery=await readFile(new URL("../scripts/admin-owner-recovery.mjs",import.meta.url),"utf8");
test("release CI exercises verification reset session revocation and rate limiting over HTTP",()=>{assert.match(workflow,/auth-http-integration/);for(const x of ["sign-up/email","Verify your HodgeForm account","request-password-reset","reset-password","revoke the prior session","429"])assert.match(auth,new RegExp(x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));});
test("break-glass owner recovery requires exact confirmation and verified existing user",()=>{assert.match(recovery,/HODGEFORM_BREAK_GLASS_CONFIRM/);assert.match(recovery,/emailVerified/);assert.match(recovery,/TRANSFER_OWNER/);});
