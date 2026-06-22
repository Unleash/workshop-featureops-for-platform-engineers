# Step 4: Wire the MCP server to your assistant

Connect your AI coding assistant to the **remote Unleash MCP server** so it can read and manage feature flags directly.

> [!NOTE]
> **Recommended in production: OAuth2 Dynamic Client Registration (DCR).**
> 
> The remote Unleash MCP server supports OAuth2 DCR, and that is the **recommended** way to authenticate a client — the assistant registers itself and obtains tokens through an interactive browser sign-in, with no long-lived secret pasted into config.
> 
> **It requires SSO**, however, and that is **not workable in this workshop**: we don't control which email domains attendees sign in with, so there is no
single SSO provider we can wire everyone through. We therefore fall back to a **Personal Access Token (PAT) presented as a `Bearer` token** (what Step 3 configured).
> 
> For your own real instance with SSO configured, prefer OAuth2 DCR over a static PAT.

## Steps

- [ ] `make workshop-configure` (Step 3) already wrote `UNLEASH_MCP_SERVER_URL` and `UNLEASH_MCP_PAT_TOKEN` into `.env`. **Export them** in the shell your assistant launches from so it inherits them — `make workshop-final-check` prints ready-to-copy `export` commands for exactly this; paste those, or run:
  ```bash
  export $(grep -E '^UNLEASH_MCP_(SERVER_URL|PAT_TOKEN)=' .env | xargs)
  ```
- [ ] Use the committed config template for your assistant — it already points at the remote server with a `Bearer` token:
  - **Claude Code** → `.mcp.json`
  - **Cursor** → `.cursor/mcp.json`
  - **GitHub Copilot (VS Code)** → `.vscode/mcp.json`
  - **Kiro** → `.kiro/settings/mcp.json`
  - **OpenCode** → `opencode.json`
  - **Codex** → `.codex/config.toml` (_autoloaded_ for trusted projects, but remember to set the `url`).
- [ ] Reload / restart your assistant so it picks up the MCP server.
- [ ] Ask the assistant to list its Unleash tools and confirm it sees all of them.

## Outcome / success

Your assistant reports the `unleash` MCP server as connected and lists at least the following tools: `evaluate_change`, `detect_flag`, `create_flag`, `wrap_change`, `set_flag_rollout`, `get_flag_state`, `toggle_flag_environment`, `remove_flag_strategy`, `cleanup_flag`. A read-only call (e.g. checking a seeded flag's state) succeeds against **your** project. The platform — not each developer — has shipped the connection, naming convention, and FeatureOps guidelines via the committed config and `AGENTS.md`.

<details>
<summary><strong>Example prompt</strong>: List the tools available in Unleash MCP server</summary>

```
List all the tools available in the unleash MCP server, and briefly say what each one does.
```
</details>

<details>
<summary><strong>Example prompt</strong>: Verify connectivity and build context about the flags for the projects available for you in the Unleash instance</summary>

```
With the use of unleash MCP, scan the codebase, find all the flags, and then prepare a table with their state in Unleash for environments in the project available based on my permissions. As an additional column, add a lifecycle stage for each flag.
```
</details>

## Tips and Tricks

> If the handshake fails, check that both env vars are exported in the same shell your assistant launched from, and that the token is a valid PAT for your instance.
