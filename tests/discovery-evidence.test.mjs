import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { validateDiscoveryEvidence } from "../src/lib/gate/discovery-evidence.ts";

test("discovery evidence rejects foreign workspaces, repositories, missing and duplicate references", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table release_candidates(id text primary key, tenant_id text not null, repository_id text not null);
      create table evidence_receipts(id text primary key, tenant_id text not null, candidate_id text not null);
      insert into release_candidates values ('a','tenant-a','repo-a'),('b','tenant-b','repo-b'),('c','tenant-a','repo-c');
      insert into evidence_receipts values ('ea','tenant-a','a'),('eb','tenant-b','b'),('ec','tenant-a','c');
    `);
    const sql = { query: async (text, parameters) => (await db.query(text, parameters)).rows };
    assert.deepEqual(await validateDiscoveryEvidence(sql, "tenant-a", "repo-a", ["ea"]), ["ea"]);
    assert.deepEqual(await validateDiscoveryEvidence(sql, "tenant-a", "repo-a", []), []);
    for (const refs of [["eb"], ["ec"], ["missing"], ["ea", "eb"], ["ea", "ea"]]) {
      await assert.rejects(validateDiscoveryEvidence(sql, "tenant-a", "repo-a", refs));
    }
  } finally {
    await db.close();
  }
});
