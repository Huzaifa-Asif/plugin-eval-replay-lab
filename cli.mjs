#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { auditFixture, hasBlockingFindings, InputError, parseFixture, reportAsMarkdown } from "./src/core.mjs";

const [file, format = "--markdown"] = process.argv.slice(2);
if (!file || !["--markdown", "--json"].includes(format)) {
  console.error("Usage: node cli.mjs <fixture.json> [--markdown|--json]");
  process.exit(2);
}
try {
  const report = auditFixture(parseFixture(await readFile(file, "utf8")));
  process.stdout.write(format === "--json" ? `${JSON.stringify(report, null, 2)}\n` : reportAsMarkdown(report));
  process.exitCode = hasBlockingFindings(report) ? 1 : 0;
} catch (error) {
  console.error(error instanceof InputError ? error.message : "Audit failed safely.");
  process.exitCode = 2;
}
