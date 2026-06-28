#!/usr/bin/env bash
# Sync agent-agnostic config from .agents/ to tool-specific adapters.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

strip_frontmatter() {
  awk 'BEGIN { fm = 0; started = 0 }
  /^---$/ { fm++; next }
  fm < 2 { next }
  {
    if (!started && $0 == "") next
    started = 1
    print
  }' "$1"
}

merge_agent_with_overlay() {
  local agent_file="$1"
  local overlay_file="$2"
  local output_file="$3"

  if [[ -f "$overlay_file" ]]; then
    awk -v overlay="$overlay_file" '
      BEGIN { in_fm = 0; fm_closed = 0 }
      /^---$/ {
        if (!in_fm) {
          in_fm = 1
          print
          next
        }
        if (!fm_closed) {
          while ((getline line < overlay) > 0) {
            if (line != "") print line
          }
          close(overlay)
          fm_closed = 1
          print
          next
        }
      }
      { print }
    ' "$agent_file" >"$output_file"
  else
    cp "$agent_file" "$output_file"
  fi
}

echo "Syncing rules -> .cursor/rules/*.mdc"
mkdir -p .cursor/rules
for rule in .agents/rules/*.md; do
  name="$(basename "$rule" .md)"
  cp "$rule" ".cursor/rules/${name}.mdc"
done

echo "Syncing agents -> .cursor/agents/*.md"
mkdir -p .cursor/agents
for agent in .agents/agents/*.md; do
  name="$(basename "$agent" .md)"
  overlay=".agents/agents/${name}.cursor.yaml"
  merge_agent_with_overlay "$agent" "$overlay" ".cursor/agents/${name}.md"
done

echo "Syncing nested AGENTS.md for Codex / Claude / Copilot"
write_nested_agents() {
  local rule_name="$1"
  shift
  local body
  body="$(strip_frontmatter ".agents/rules/${rule_name}.md")"
  for dest in "$@"; do
    mkdir -p "$(dirname "$dest")"
    printf '%s\n' "$body" >"$dest"
  done
}

write_nested_agents api-backend apps/api-backend/AGENTS.md
write_nested_agents web-frontend apps/web/AGENTS.md packages/ui/AGENTS.md
write_nested_agents python-worker apps/python-worker/AGENTS.md
write_nested_agents database-prisma packages/database/AGENTS.md
write_nested_agents grpc-contract packages/proto/AGENTS.md

echo "Agent config sync complete."
