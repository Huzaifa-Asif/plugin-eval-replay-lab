# Security policy

## Supported version

Only the latest release is supported.

## Report a vulnerability

Use GitHub's private vulnerability reporting for this repository. Do not include live credentials, private evaluation traces, personal data, or exploit material beyond the minimum reproducible synthetic fixture.

## Boundaries

The app never fetches user-supplied URLs, executes fixture content, calls a model, or connects to an MCP server. Treat imported prompts, descriptions, arguments, and outputs as untrusted data. A clean report is not a security review of the evaluated plugin.
