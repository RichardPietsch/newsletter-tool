#!/bin/sh
set -eu

child_pid=''

terminate() {
  if [ -n "$child_pid" ]; then
    kill -TERM "$child_pid" 2>/dev/null || true
    wait "$child_pid" 2>/dev/null || true
  fi
  exit 0
}

trap terminate TERM INT

while true; do
  ./node_modules/.bin/tsx scripts/purge-audit-events.ts &
  child_pid=$!
  wait "$child_pid"
  child_pid=''

  sleep 86400 &
  child_pid=$!
  wait "$child_pid"
  child_pid=''
done
