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
  host-resource-management.sh status
  host-resource-management.sh render
  host-resource-management.sh apply
  host-resource-management.sh rollback
  host-resource-management.sh contention-status
  host-resource-management.sh contention-apply
  host-resource-management.sh contention-rollback
  host-resource-management.sh clock-status
  host-resource-management.sh clock-apply
  host-resource-management.sh clock-rollback
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
  status)
    ansible_playbook \
      playbooks/maintenance/cgroup-tiering-status.yml
    ;;
  render)
    ansible-playbook playbooks/maintenance/cgroup-tiering-render.yml
    ;;
  apply)
    ansible_playbook \
      playbooks/maintenance/cgroup-tiering-apply-v1.yml
    ansible_playbook \
      playbooks/maintenance/contention-tiering-apply-v1.yml
    ;;
  rollback)
    ansible_playbook \
      playbooks/maintenance/contention-tiering-rollback-v1.yml
    ansible_playbook \
      playbooks/maintenance/cgroup-tiering-rollback-v1.yml
    ;;
  contention-status)
    ansible_playbook \
      playbooks/maintenance/contention-tiering-status.yml
    ;;
  contention-apply)
    ansible_playbook \
      playbooks/maintenance/contention-tiering-apply-v1.yml
    ;;
  contention-rollback)
    ansible_playbook \
      playbooks/maintenance/contention-tiering-rollback-v1.yml
    ;;
  clock-status)
    ansible_playbook \
      playbooks/maintenance/clock-frequency-tiering-status.yml
    ;;
  clock-apply)
    ansible_playbook \
      playbooks/maintenance/clock-frequency-tiering-apply-v1.yml
    ;;
  clock-rollback)
    ansible_playbook \
      playbooks/maintenance/clock-frequency-tiering-rollback-v1.yml
    ;;
  *)
    usage
    exit 64
    ;;
esac
