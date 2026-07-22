#!/usr/bin/env sh
set -e

# Enforce branch naming: feat/*, fix/*, chore/* (main is allowed for local work).
# Used by the Husky pre-commit hook.

branch=$(git branch --show-current 2>/dev/null || true)

# Detached HEAD (e.g. rebase) — skip naming rules.
if [ -z "$branch" ]; then
  exit 0
fi

if [ "$branch" = "main" ]; then
  exit 0
fi

case "$branch" in
  feat/*|fix/*|chore/*)
    # Require a non-empty slug after the prefix (feat/ alone is invalid).
    suffix=${branch#*/}
    if [ -n "$suffix" ]; then
      exit 0
    fi
    ;;
esac

echo ""
echo "✖ Invalid branch name: '${branch}'"
echo ""
echo "  Branch names must start with one of:"
echo "    feat/   — new features"
echo "    fix/    — bug fixes"
echo "    chore/  — maintenance, docs, tooling"
echo ""
echo "  Examples: feat/email-sync-filters, fix/login-redirect, chore/husky-hooks"
echo "  Rename with: git branch -m feat/your-slug"
echo ""
exit 1
