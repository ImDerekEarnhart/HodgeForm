import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const wf=await readFile(new URL("../.github/workflows/security.yml",import.meta.url),"utf8");const rel=await readFile(new URL("../.github/workflows/release.yml",import.meta.url),"utf8");
test("security pipeline includes CodeQL Trivy image/fs scanning and local secret scan",()=>{assert.match(wf,/codeql-action\/init@v4/);assert.match(wf,/trivy-action@v0\.36\.0/);assert.match(wf,/scan-type: fs/);assert.match(wf,/image-ref: hodgeform:security/);assert.match(rel,/security-static-scan\.mjs/);assert.match(rel,/npm audit --omit=dev --audit-level=high/);});
