@AGENTS.md

## Claude Code specifics

- Project skills live in `.claude/skills/` (`add-backend-feature`, `add-frontend-page`, `change-keycloak-page`,
  `verify-stack`). Use them for those tasks.
- Project MCP servers (`.mcp.json`, versions pinned): `context7` for current library docs (prefer it over memory for
  Spring Boot 4, Keycloak 26, React 19, Tailwind 4, shadcn), `playwright` for browser checks (isolated Chrome profile),
  `shadcn` for the component registry (runs in `frontend/packages/ui`). The file uses `cmd /c` because native Windows
  needs it to start `npx`/`pnpm`; on macOS or Linux drop `"cmd", "/c"` and use the next argument as the command.
- `.claude/settings.json` denies reading `.env` and other secret files. Don't try to work around it. To act as a seeded
  user, create a fresh account through the UI or the e2e suite instead.
- `.claude/launch.json` defines preview servers: `web-dev` (:5173), `theme-dev` (:5174) and `edge` (the running stack
  on :8080).
- Verify UI and auth changes in a real browser (preview pane or the e2e suite), not only with unit tests.
