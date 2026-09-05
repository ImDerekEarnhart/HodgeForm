import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dockerfile = await readFile(new URL("../Dockerfile", import.meta.url), "utf8");

test("production image upgrades base packages, ships production dependencies, and runs unprivileged", () => {
  assert.match(dockerfile, /RUN apk upgrade --no-cache/);
  assert.match(dockerfile, /npm prune --omit=dev/);
  assert.match(dockerfile, /rm -rf \/usr\/local\/lib\/node_modules\/npm \/usr\/local\/lib\/node_modules\/corepack/);
  assert.match(dockerfile, /COPY --chown=hodgeform:hodgeform --from=build \/app\/node_modules/);
  assert.match(dockerfile, /USER hodgeform/);
});
