# Your Plugin Passed Once. Can You Prove It Still Selects the Right Tool?

Tool definitions rarely stay still. A name becomes clearer. A description gains a boundary. An input field becomes required. A write action gets a confirmation step. Authentication changes. Then a prompt that selected the right tool yesterday starts calling a neighbor—or calls nothing at all.

The difficult part is not writing a handful of test prompts. It is preserving what happened and comparing the result without turning every release review into a spreadsheet exercise.

Plugin Eval Replay Lab is a small local-first tool for that gap. It scores sanitized recorded plugin evaluations against explicit expectations. It does not call a model, connect to an MCP server, or upload a trace.

## The contract is wider than “did a tool run?”

Current OpenAI plugin testing guidance recommends direct requests, indirect requests, follow-ups that reuse identifiers, writes that require authorization or confirmation, and unsupported requests that should not call tools. It also asks developers to verify schema validation, annotations, useful errors, and model-readable results—and to rerun affected evaluations when tool metadata changes.

A useful replay artifact therefore needs to answer several questions:

1. Did every expected tool run?
2. Did an unexpected tool run?
3. Did a negative case correctly select nothing?
4. Did captured arguments fit the declared schema?
5. Did a consequential action preserve confirmation evidence?
6. Did a follow-up reuse the identifier from the prior result instead of inventing one?
7. Can the evidence be reviewed without copying secrets or production content into another system?

The Lab makes those checks deterministic.

## A deliberately small fixture

Each fixture contains a tool catalog and recorded cases. A case declares its kind, prompt, expected tools, and sanitized observed calls. Follow-ups may include a path-level assertion that an argument reused a prior synthetic identifier.

```json
{
  "id": "follow-up-archive",
  "kind": "follow_up",
  "prompt": "Archive that one.",
  "prior": {
    "selected": { "project_id": "project_synthetic_7" }
  },
  "expected": {
    "tools": ["archive_project"],
    "confirmation": "required",
    "reuseArgumentPaths": [
      {
        "callIndex": 0,
        "path": "project_id",
        "source": "selected.project_id"
      }
    ]
  },
  "observed": {
    "calls": [
      {
        "tool": "archive_project",
        "arguments": { "project_id": "project_synthetic_7" },
        "confirmationObserved": true
      }
    ]
  }
}
```

The CLI returns zero when no high or critical finding exists, one when a release-blocking finding exists, and two when the fixture itself is invalid. The browser presents the same deterministic report.

## Safety is part of the evidence format

Evaluation traces can carry exactly the data that should not leak into a debugging tool: access tokens, authorization headers, private prompts, personal records, and model-visible instructions copied from an external source.

The Lab is designed around synthetic evidence. It has no analytics, account, persistence, remote API, or user-selected URL. Inputs are bounded by bytes, tool count, case count, call count, nesting depth, and total values. Secret-like keys and recognizable credential formats produce path-only findings; report output never reproduces the matched value. Captured prompt text and tool descriptions remain inert data and are rendered as text.

That does not make arbitrary production traces safe to paste. The rule remains simple: use synthetic or explicitly redacted evidence.

## Where it fits—and where it does not

Use MCP Inspector when you need to discover and call tools on a live server. Use Promptfoo when you need a broad open-source model-evaluation and red-team framework. Use Braintrust or LangSmith when you need hosted experiments, collaboration, production tracing, and observability. Use Plugin Review Case Studio when you need to author the current directory review cases.

Plugin Eval Replay Lab is narrower. It is useful when you already captured observations and want a small, dependency-free regression artifact that can sit beside the code under review.

It does not judge whether a final answer was good. It does not verify the identity of the deployed server. It does not measure stochastic reliability from one observation. It does not replace live authentication, authorization, confirmation, revocation, or end-to-end testing. Passing is evidence about the fixture—not certification of the plugin and not OpenAI approval.

## Release evidence

Version 0.1.0 includes the browser app, CLI, portable audit skill, passing and failing synthetic examples, bounded schema checks, follow-up and confirmation checks, privacy/security guidance, threat model, CI, release checklist, contribution templates, and automated tests across supported Node.js versions.

The source is available in the [public repository](https://github.com/Huzaifa-Asif/plugin-eval-replay-lab), and the browser build runs on [personal GitHub Pages](https://huzaifa-asif.github.io/plugin-eval-replay-lab/). Release verification covered 48 automated tests, lint, deterministic build, dependency audit, Node.js 20/22/24 CI, an independent adversarial review, exact-commit deployment, and live-content checks. The 1672×941 cover was independently inspected at original resolution; its typography, central replay flow, safe margins, and crop are intact. This article is a launch draft and has not been posted to an editorial or social destination.

## The next test is still live

After a clean replay, connect the exact release candidate in an isolated environment. Exercise direct and indirect requests, multi-turn follow-ups, missing and malformed arguments, account boundaries, authentication failures, write confirmations, negative selection, result quality, revocation, and mobile/desktop behavior. Capture fresh sanitized evidence, then replay it again when the tool surface changes.

The point is not to replace a real evaluation. It is to keep its evidence reviewable.
