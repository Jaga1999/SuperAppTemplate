@AGENTS.md

## Claude Code specifics

- Project skills live in `.claude/skills/` (`add-backend-feature`, `add-frontend-page`, `change-keycloak-page`,
  `verify-stack`). Use them for those tasks.
- `.claude/settings.json` denies reading `.env` and other secret files. Don't try to work around it. To act as a user,
  create a fresh account through the UI or the e2e suite instead.
- `.claude/launch.json` defines preview servers: `web-dev` (:5173), `theme-dev` (:5174) and `edge` (the running stack
  on :8080).
- Verify UI and auth changes in a real browser (preview pane or the e2e suite), not only with unit tests.
