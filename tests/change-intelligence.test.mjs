import test from "node:test";
import assert from "node:assert/strict";
import { compareComponents, componentObligations, componentsSchema } from "../src/lib/gate/change-intelligence.ts";
const c = { id: "direction", kind: "representation", digest: "a".repeat(64), contract: "Current position only" };
test("content and contract changes both require explicit independent obligations", () => {
  assert.deepEqual(compareComponents([c], [c]), []);
  for (const after of [{ ...c, digest: "b".repeat(64) }, { ...c, contract: "Position plus observed direction" }]) {
    const diff = compareComponents([c], [after]);
    assert.equal(diff[0].operation, "modified");
    assert.deepEqual(diff[0].before, c);
    assert.equal(componentObligations(diff)[0].minimumIndependence, "independent");
  }
});
test("removing a verifier or changing its kind cannot erase the old verification obligation", () => {
  const verifier = { ...c, kind: "verifier" };
  assert.equal(componentObligations(compareComponents([verifier], []))[0].id, "HF-EVO-verifier-direction");
  const changes = compareComponents([verifier], [{ ...c, kind: "prompt" }]);
  assert.deepEqual(changes.map(c => c.operation), ["removed", "added"]);
  assert.equal(componentObligations(changes).length, 2);
});
test("ambiguous IDs and unbound component hashes are rejected", () => {
  assert.equal(componentsSchema.safeParse([c, c]).success, false);
  assert.equal(componentsSchema.safeParse([{ ...c, digest: "latest" }]).success, false);
  assert.equal(componentsSchema.safeParse([{ ...c, id: "../escape" }]).success, false);
});
