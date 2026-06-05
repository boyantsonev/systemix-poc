#!/usr/bin/env bash
# Register (or re-register) the Hermes launchd agents on this machine.
# Idempotent: safe to re-run after editing the plists. Uninstall: ./install.sh uninstall
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="$HOME/Library/LaunchAgents"
DOMAIN="gui/$(id -u)"
LABELS=(com.systemix.hermes.daily com.systemix.hermes.weekly)

mkdir -p "$DEST"

if [[ "${1:-install}" == "uninstall" ]]; then
  for L in "${LABELS[@]}"; do
    launchctl bootout "$DOMAIN/$L" 2>/dev/null || true
    rm -f "$DEST/$L.plist"
    echo "removed $L"
  done
  exit 0
fi

for L in "${LABELS[@]}"; do
  cp "$HERE/$L.plist" "$DEST/$L.plist"
  launchctl bootout "$DOMAIN/$L" 2>/dev/null || true
  launchctl bootstrap "$DOMAIN" "$DEST/$L.plist"
  echo "registered $L"
done

echo
echo "Active Hermes agents:"
launchctl list | grep systemix.hermes || echo "(none found — check Console for errors)"
