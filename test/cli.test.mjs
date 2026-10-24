import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

const cwd = new URL("../", import.meta.url).pathname;
test("valid CLI exits zero", () => {
  const result = spawnSync(process.execPath, ["cli.mjs", "examples/valid.json", "--markdown"], { cwd, encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /5\/5 passed/);
});
test("unsafe CLI gates", () => {
  const result = spawnSync(process.execPath, ["cli.mjs", "examples/unsafe.json", "--json"], { cwd, encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /negative_case_called_tool/);
});
test("CLI usage exits two", () => assert.equal(spawnSync(process.execPath, ["cli.mjs"], { cwd }).status, 2));
test("malformed fixture exits two without echo", () => {
  const result = spawnSync(process.execPath, ["cli.mjs", "package.json", "--json"], { cwd, encoding: "utf8" });
  assert.equal(result.status, 2);
  assert.ok(!result.stderr.includes("plugin-eval-replay-lab"));
});
