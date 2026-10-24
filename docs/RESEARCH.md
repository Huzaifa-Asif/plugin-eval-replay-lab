# Research and alternatives — 2026-10-25 MYT

## Need

OpenAI's current plugin testing guidance says to retain evaluation prompts and results, cover direct and indirect selection, follow-up identifier reuse, writes requiring authorization or confirmation, unsupported requests, schema validation, annotations, and model-readable results. It also says affected evaluations should be rerun when tool names, descriptions, schemas, annotations, authentication, or UI resources change.

That creates a concrete review gap between authoring cases and operating a full evaluation platform: teams need a small deterministic way to score already-captured, sanitized observations in code review.

Primary sources:

- https://developers.openai.com/plugins/deploy/connect-chatgpt
- https://developers.openai.com/plugins/plan/tools
- https://developers.openai.com/plugins/reference
- https://developers.openai.com/plugins/guides/security-privacy

Research benchmarks also treat tool selection, parameter construction, trajectory quality, and task completion as separate dimensions:

- MCP-RADAR, 2025-05-22: https://arxiv.org/abs/2505.16700
- MCP-Bench, 2025-08-28: https://arxiv.org/abs/2508.20453
- Tool-description smell study, 2026-02-21: https://arxiv.org/abs/2602.18914

## Alternatives and licenses

- MCP Inspector connects to and calls live MCP servers. Its project is transitioning new code/specification contributions to Apache-2.0; it is the stronger choice for transport and live tool inspection.
- Promptfoo is a broad MIT-licensed open-source evaluation and red-team platform with model/provider integrations, CI, scoring, and a free community tier.
- Braintrust and LangSmith provide broader hosted experiments, production tracing, collaboration, and observability; their hosted capabilities and pricing should be checked at purchase time.
- Plugin Review Case Studio authors OpenAI directory review cases; it does not score recorded executions.

No alternative code was copied. This project has no paid or hosted dependency.

## Novelty and limitation

Tool-selection evaluation, schema validation, trace scoring, and regression tests are established practices. The original contribution is deliberately small: a bounded local fixture format and deterministic replay scorer aligned with the current OpenAI plugin evaluation checklist. It does not run models, connect to servers, judge final-answer quality, or replace a statistical evaluation system.
