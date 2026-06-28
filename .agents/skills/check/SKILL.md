---
name: check
description: Run all quality checks (format, lint, types) across the monorepo before committing.
disable-model-invocation: true
---

# Quality Checks

Run all three checks and report results. Fix issues found, then re-run until clean.

```bash
pnpm format:check   # Prettier (singleQuote, trailingComma: all)
pnpm lint           # ESLint via turbo, all workspaces
pnpm check-types    # tsc via turbo, all workspaces
```

## Fixing issues

- **Format failures:** run `pnpm format` to auto-fix, never hand-format.
- **Lint failures:** fix the underlying code; do not disable rules unless the rule is already disabled elsewhere for the same legitimate reason (e.g. `@typescript-eslint/no-unsafe-*` in api-backend for Prisma noise).
- **Type failures in apps importing `@repo/*`:** the shared package may need a rebuild — check that `@repo/database` and `@repo/constant` have compiled output (they build via `turbo dev`/`build`).

## Notes

- There is no Python linter configured; Python changes are not covered by these checks.
- There is no meaningful test suite yet — do not claim tests passed.
