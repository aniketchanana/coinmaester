---
name: add-env-var
description: Add a new environment variable correctly across the monorepo. Use whenever introducing or renaming an env var.
---

# Adding an Environment Variable

All apps share the **single root `.env`**. A new variable must be registered in every relevant place or it will silently be missing at runtime or break turbo caching.

## Steps

1. **`.env.example`** — add the variable with a safe placeholder or sensible default, grouped under the matching section comment (Database / Auth / Apps / Messaging / LLM).

2. **`turbo.json`** — add the name to the `globalEnv` array (required for cache invalidation; the shared ESLint config also warns on undeclared env vars).

3. **Consumer wiring:**
   - **api-backend:** read via `process.env` (root `.env` loaded by `load-env.ts`), ideally through the relevant NestJS config/service.
   - **web:** browser-exposed vars must be prefixed `NEXT_PUBLIC_`.
   - **python-worker:** add a typed field to the pydantic-settings class in `apps/python-worker/config.py`.

4. **Local `.env`** — remind the user to add the real value to their local `.env` (it is gitignored; never write secrets to `.env.example`).

## Checklist

- [ ] `.env.example` updated with placeholder
- [ ] `turbo.json` `globalEnv` updated
- [ ] Consumer(s) read the var through their config layer
- [ ] No secret values committed
