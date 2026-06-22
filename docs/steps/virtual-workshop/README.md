# Virtual Workshop: Hands-on Handouts

This is a hands-on FeatureOps workshop. Each step listed below has a short handout:
- a **steps checklist**
- the **outcome** that means you succeeded
- **example prompts** for the steps you drive with your AI assistant.

Work at your own pace inside each step and follow the lecturer's instructions before moving forward.

| # | Step                                                   | Time   | Handout                                                        |
|---|--------------------------------------------------------|--------|----------------------------------------------------------------|
| 1 | Cold open: the gap AI created                          | 6 min  | _presenter-led — no hands-on_                                  |
| 2 | Three-layer diagnostic + the two roads                 | 6 min  | _presenter-led — no hands-on_                                  |
| 3 | Setup: Environment Check                               | 10 min | [03-environment-check.md](03-environment-check.md)             |
| 4 | Wire the MCP server to your assistant                  | 10 min | [04-wire-mcp.md](04-wire-mcp.md)                               |
| 5 | Generate a change with a flag (with the agent)         | 15 min | [05-generate-flagged-change.md](05-generate-flagged-change.md) |
| 6 | Author the release policy                              | 14 min | [06-release-policy.md](06-release-policy.md)                   |
| 7 | Reversibility as a service: Safeguards & Kill Switches | 13 min | [07-safeguards-killswitch.md](07-safeguards-killswitch.md)     |
| 8 | Lifecycle + Governance                                 | 8 min  | [08-lifecycle-governance.md](08-lifecycle-governance.md)       |
| 9 | Close: the Paved Path repository + Summary             | 8 min  | _presenter-led — no hands-on_                                  |

**Notes:**
- Your flags, segments, impact metrics, and context fields are scoped to **your** project named `project-NNN`.
- They are named with the `pNNN_` prefix (e.g. `p001_internal-users`).
- You create your own *Personal Access Token (PAT)* and run `make workshop-configure`, which detects your project number and fills in the Unleash URLs and tokens for you (Step 3).
