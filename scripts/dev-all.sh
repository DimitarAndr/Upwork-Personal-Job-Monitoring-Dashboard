#!/usr/bin/env bash

set -euo pipefail

api_pid=""
web_pid=""

cleanup() {
  if [[ -n "${api_pid}" ]] && kill -0 "${api_pid}" 2>/dev/null; then
    kill "${api_pid}" 2>/dev/null || true
  fi

  if [[ -n "${web_pid}" ]] && kill -0 "${web_pid}" 2>/dev/null; then
    kill "${web_pid}" 2>/dev/null || true
  fi
}

# Keep dockerized services detached, but stop the dev servers when this script exits.
trap cleanup EXIT INT TERM

npm run services:up

npm run dev:api &
api_pid=$!

npm run dev:web &
web_pid=$!

wait "${api_pid}" "${web_pid}"
