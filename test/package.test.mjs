import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("portable manifest uses current schema and fixed skill discovery", async () => {
  const manifest = JSON.parse(await readFile(new URL("../plugin.json", import.meta.url), "utf8"));
  assert.equal(manifest.$schema, "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json");
  assert.equal(manifest.name, "plugin-eval-replay-lab");
  assert.equal(manifest.version, "0.1.0");
  assert.equal(manifest.license, "MIT");
  assert.equal(Object.hasOwn(manifest, "skills"), false);
  const skill = await readFile(new URL("../skills/audit-plugin-eval-replay/SKILL.md", import.meta.url), "utf8");
  assert.match(skill, /^---\nname: audit-plugin-eval-replay\n/);
});

test("workflows pin actions and scope Pages deployment permissions", async () => {
  const ci = await readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
  const pages = await readFile(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");
  assert.doesNotMatch(`${ci}\n${pages}`, /uses:\s+[^\s]+@(main|master|v\d+)/);
  assert.match(pages, /build:\n\s+permissions:\n\s+contents: read/);
  assert.match(pages, /deploy:\n\s+permissions:\n\s+contents: read\n\s+pages: write\n\s+id-token: write/);
});
