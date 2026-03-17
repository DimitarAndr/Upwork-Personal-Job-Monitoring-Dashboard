#!/usr/bin/env bash

set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="${root_dir}/.env"
server_name="${POSTGRES_MCP_NAME:-postgres}"

load_env() {
  if [[ -f "${env_file}" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "${env_file}"
    set +a
  fi
}

resolve_url() {
  load_env
  local url="${POSTGRES_MCP_URL:-${DATABASE_URL:-}}"
  if [[ -z "${url}" ]]; then
    echo "POSTGRES_MCP_URL or DATABASE_URL must be set in ${env_file} or your shell." >&2
    exit 1
  fi

  printf '%s' "${url}"
}

add_server() {
  local url
  url="$(resolve_url)"

  if codex mcp get "${server_name}" >/dev/null 2>&1; then
    codex mcp remove "${server_name}" >/dev/null
  fi

  codex mcp add "${server_name}" \
    --env "POSTGRES_MCP_URL=${url}" \
    -- \
    sh -lc 'npx -y @modelcontextprotocol/server-postgres "$POSTGRES_MCP_URL"'

  codex mcp list
}

status_server() {
  if codex mcp get "${server_name}" >/dev/null 2>&1; then
    codex mcp get "${server_name}"
    return
  fi

  echo "MCP server '${server_name}' is not configured."
}

remove_server() {
  if codex mcp get "${server_name}" >/dev/null 2>&1; then
    codex mcp remove "${server_name}"
    return
  fi

  echo "MCP server '${server_name}' is not configured."
}

usage() {
  cat <<'EOF'
Usage: bash ./scripts/postgres-mcp.sh <command>

Commands:
  add      Register the PostgreSQL MCP server using POSTGRES_MCP_URL or DATABASE_URL
  status   Show configured MCP servers
  remove   Remove the PostgreSQL MCP server registration
EOF
}

case "${1:-}" in
  add)
    add_server
    ;;
  status)
    status_server
    ;;
  remove)
    remove_server
    ;;
  *)
    usage
    exit 1
    ;;
esac
