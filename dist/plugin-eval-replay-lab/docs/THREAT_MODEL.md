# Threat model

## Assets

- Tool definitions and behavioral annotations
- Evaluation prompts and captured arguments
- Synthetic identifiers and release decisions

## Threats and controls

- **Credential or personal-data disclosure:** guidance requires synthetic fixtures; secret-like keys and recognizable credential formats generate path-only critical findings.
- **Prompt injection in captured text:** fixture strings are data, never instructions or code. The browser writes reports with `textContent`; the CLI emits fixed messages and safe paths.
- **Resource exhaustion:** input is limited to 1 MiB, 100 tools, 200 cases, 20 calls per case, 12 nesting levels, and 20,000 values.
- **Schema abuse:** only a documented bounded subset is interpreted; no regular expressions, references, remote schemas, or executable formats run.
- **Path or network abuse:** the browser makes only same-origin example requests. The local server checks Host and serves a fixed allowlist. User input cannot select a file or URL.
- **Misleading assurance:** reports state that saved evidence cannot prove deployed identity, live behavior, stochastic reliability, answer quality, or platform approval.

## Residual risk

Captured evidence may be fabricated, incomplete, stale, or unrepresentative. A legitimate identifier can still be sensitive. Review fixture provenance and use an isolated live evaluation before release.
