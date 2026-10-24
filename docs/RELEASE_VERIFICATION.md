# Release verification

- Run lint, all tests, build, dependency audit, JSON parsing, valid/unsafe CLI journeys, and archive inspection.
- Run CI on Node.js 20, 22, and 24 with commit-pinned actions.
- Exercise the loopback UI, expected example routes, keyboard focus, live status, CSP, no-sniff, referrer, permissions, and no-store headers.
- Scan tracked files for credentials, employer/private identifiers, lifecycle scripts, unexpected network APIs, and unsafe DOM sinks.
- Obtain independent protocol, security, accessibility, documentation, overlap, and release review; fix blockers with regression tests.
- Verify GitHub identity, signed commit/tag, exact-commit CI, Pages deployment, live content, release assets, and hashes separately.
- Keep GitHub release, deployment, OpenAI submission, approval, publication, and editorial posting as distinct states.
