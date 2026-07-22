#!/usr/bin/env sh
set -e

# Skip outside local git checkouts (Docker/CI installs, turbo prune, etc.).
# Husky also honors HUSKY=0 to disable hook installation.
if [ "${HUSKY:-}" = "0" ] || [ ! -d .git ]; then
  exit 0
fi

# Install Husky git hooks (sets core.hooksPath to .husky/_).
# Silent on success by default — print a short confirmation for contributors.
husky

hooks_path=$(git config core.hooksPath 2>/dev/null || true)
if [ -z "$hooks_path" ]; then
  echo "✖ Husky did not set core.hooksPath. Are you inside a git repo?"
  exit 1
fi

echo "✔ Git hooks installed (core.hooksPath=${hooks_path})."
echo "  On commit, .husky/pre-commit will: check branch name, then pnpm lint && pnpm test"
