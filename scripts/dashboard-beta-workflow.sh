#!/usr/bin/env bash
set -euo pipefail

ansible_playbook() {
  local args=("$@")

  if sudo -n true >/dev/null 2>&1; then
    ansible-playbook -i inventory/hosts.yml "${args[@]}"
  else
    ansible-playbook -K -i inventory/hosts.yml "${args[@]}"
  fi
}

usage() {
  cat <<'EOF' >&2
usage:
  dashboard-beta-workflow.sh render
  dashboard-beta-workflow.sh serve [port]
EOF
}

if [[ $# -lt 1 ]]; then
  usage
  exit 64
fi

ACTION="$1"
shift

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${PROJECT_ROOT}"

case "${ACTION}" in
  render)
    ansible_playbook \
      playbooks/maintenance/live-state-dashboard.yml
    ;;
  serve)
    PORT="${1:-8082}"
    ansible_playbook \
      playbooks/maintenance/live-state-dashboard.yml
    exec python3 "${PROJECT_ROOT}/dashboard-beta/server.py" "${PORT}"
    ;;
  *)
    usage
    exit 64
    ;;
esac
