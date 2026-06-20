# GitHub Copilot instructions

Follow the canonical FeatureOps agent guidelines in
[`AGENTS.md`](../AGENTS.md). They are the single source of truth for this repo.

Key rules (full detail in that file):

- **Flag-gate risky changes**, especially payments — wrap them behind an Unleash feature flag via the MCP workflow (`evaluate_change → detect_flag → create_flag → wrap_change`).
- **Naming convention:** `p<NNN>_<rl|ex|op|kx|pm>_[v_]<domain>_<component>_<slug>`.
- **Always pass the project id explicitly** (`project-NNN`) — the remote MCP server has no default project.
- **Treat `PayBro` and `Dashed` like real payment providers**, not mocks.
