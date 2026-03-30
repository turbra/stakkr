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
  host-resource-management.sh host-resource-management-apply
  host-resource-management.sh host-resource-management-rollback
  host-resource-management.sh host-resource-management-status
  host-resource-management.sh host-memory-oversubscription-apply
  host-resource-management.sh host-memory-oversubscription-rollback
  host-resource-management.sh host-memory-oversubscription-status
  host-resource-management.sh shared-execution-pool-apply
  host-resource-management.sh shared-execution-pool-rollback
  host-resource-management.sh shared-execution-pool-status
  host-resource-management.sh contention-status
  host-resource-management.sh contention-apply
  host-resource-management.sh contention-rollback
  host-resource-management.sh clock-status
  host-resource-management.sh clock-apply
  host-resource-management.sh clock-rollback

legacy aliases:
  host-resource-management.sh apply
  host-resource-management.sh rollback
  host-resource-management.sh status
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
  host-resource-management-apply)
    ansible_playbook \
      playbooks/maintenance/host-resource-management-apply.yml
    ;;
  host-resource-management-rollback)
    ansible_playbook \
      playbooks/maintenance/host-resource-management-rollback.yml
    ;;
  host-resource-management-status)
    ansible_playbook \
      playbooks/maintenance/host-resource-management-status.yml
    ;;
  host-memory-oversubscription-apply)
    ansible_playbook \
      playbooks/maintenance/host-memory-oversubscription-apply.yml
    ;;
  host-memory-oversubscription-rollback)
    ansible_playbook \
      playbooks/maintenance/host-memory-oversubscription-rollback.yml
    ;;
  host-memory-oversubscription-status)
    ansible_playbook \
      playbooks/maintenance/host-memory-oversubscription-status.yml
    ;;
  shared-execution-pool-status|status)
    ansible_playbook \
      playbooks/maintenance/cgroup-tiering-status.yml
    ;;
  render)
    ansible-playbook playbooks/maintenance/cgroup-tiering-render.yml
    ;;
  shared-execution-pool-apply|apply)
    ansible_playbook \
      playbooks/maintenance/cgroup-tiering-apply-v1.yml
    ansible_playbook \
      playbooks/maintenance/contention-tiering-apply-v1.yml
    ;;
  shared-execution-pool-rollback|rollback)
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
