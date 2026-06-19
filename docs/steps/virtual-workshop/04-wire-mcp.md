# Step 4: Wire the MCP server to your assistant

Connect your AI coding assistant to the **remote Unleash MCP server** so it can read and manage
feature flags directly.

## Steps

- [ ] Set the two MCP values in `.env` **and export** them in your shell so your assistant inherits them:
      - `UNLEASH_MCP_SERVER_URL` (e.g. `https://<region>.app.unleash-hosted.com/<instance>/api/admin/mcp`)
        - That will be given by the lecturer (slide / chat).
      - `UNLEASH_MCP_PAT_TOKEN` (you need to create your own _Personal Access Token (PAT)_).
- [ ] Use the committed config template for your assistant — it already points at the remote
      server with a `Bearer` token:
      - **Claude Code** → `.mcp.json`
      - **Cursor** → `.cursor/mcp.json`
      - **GitHub Copilot (VS Code)** → `.vscode/mcp.json`
      - **Kiro** → `.kiro/settings/mcp.json`
      - **OpenCode** → `opencode.json`
      - **Codex** → `.codex/config.toml` (_autoloaded_ for trusted projects, but remember to set the `url`).
- [ ] Reload / restart your assistant so it picks up the MCP server.
- [ ] Ask the assistant to list its Unleash tools and confirm it sees all of them.

## Outcome / success

Your assistant reports the `unleash` MCP server as connected and lists at least the following tools:
`evaluate_change`, `detect_flag`, `create_flag`, `wrap_change`, `set_flag_rollout`,
`get_flag_state`, `toggle_flag_environment`, `remove_flag_strategy`, `cleanup_flag`. A read-only
call (e.g. checking a seeded flag's state) succeeds against **your** project. The platform — not
each developer — has shipped the connection, naming convention, and FeatureOps guidelines via the
committed config and `.agent/AGENTS.md`.

<details>
<summary>Example prompt — list the tools</summary>

```
List the tools available from the Unleash MCP server, and briefly say what each one does.
```
</details>

<details>
<summary>Example prompt — verify connectivity against your project</summary>

```
Using the Unleash MCP server, tell me which flags are available in the projects scoped to my permissions 
and their state.
```
</details>

> If the handshake fails, check that both env vars are exported in the same shell your assistant
> launched from, and that the token is a valid PAT for your instance.
