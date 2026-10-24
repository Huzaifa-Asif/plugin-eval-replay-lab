# Plugin Eval Replay Lab

A dependency-free, local-first browser app, CLI, and portable skill for scoring sanitized recorded plugin evaluations against declared tool-selection expectations. It checks expected and unexpected calls, bounded input-schema agreement, consequential-action confirmation evidence, negative cases, follow-up identifier reuse, credential-like content, and deterministic pass rates without contacting a model or MCP server.

## Why

Current OpenAI plugin testing guidance asks developers to retain evaluation prompts and results, cover direct and indirect requests, follow-ups, write confirmations, unsupported requests, and rerun affected cases when tool metadata changes. The Lab turns those saved observations into a reviewable regression artifact.

It is distinct from Plugin Review Case Studio, which authors directory review cases. This app scores captured executions. MCP Inspector is better for calling a live server; Promptfoo, Braintrust, and LangSmith are stronger for running broad model evaluations, experiments, and production traces.

## Run

Requires Node.js 20 or newer.

```sh
npm run check
npm start
node cli.mjs examples/valid.json --markdown
node cli.mjs examples/unsafe.json --json
```

Open `http://127.0.0.1:4173`.

## Fixture contract

Each fixture declares a bounded tool catalog and 1–200 cases. Cases are `direct`, `indirect`, `follow_up`, `write`, or `negative`; each includes expected tools and sanitized observed calls. A follow-up can assert that an argument path reused a prior synthetic identifier. See `examples/valid.json`.

Exit codes are `0` for no high/critical finding, `1` for a blocking finding, and `2` for invalid input. Reports contain finding codes, safe paths, and fixed explanations; they do not copy field values.

## Privacy, security, and accessibility

The app has no telemetry, account, backend API, persistence, third-party assets, or post-load cross-origin network request. Use synthetic or redacted evidence only. Inputs are bounded to 1 MiB, 100 tools, 200 cases, 20 calls per case, 12 levels, and 20,000 values. Output uses text rendering, and the loopback server checks Host and serves a fixed allowlist with a restrictive CSP.

The UI has a skip link, native labels and controls, visible keyboard focus, a live status region, semantic headings, high contrast, responsive layout, and reduced-motion behavior.

## Limits

This is a deterministic saved-trace preflight, not a model evaluator, live MCP client, prompt-quality judge, complete JSON Schema validator, security certification, or OpenAI approval. It cannot prove the observed trace came from the declared deployment, detect stochastic regressions without repeated captures, or decide whether a model's final answer was useful.

MIT licensed original code. See [research](docs/RESEARCH.md), [threat model](docs/THREAT_MODEL.md), [privacy](PRIVACY.md), [security](SECURITY.md), [support](SUPPORT.md), and [release verification](docs/RELEASE_VERIFICATION.md).
