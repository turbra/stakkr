#!/usr/bin/env bash
set -euo pipefail

HOST_RESOURCE_VARS="vars/global/host_resource_management.yml"
HOST_MEMORY_VARS="vars/global/host_memory_oversubscription.yml"
CGROUP_TIERING_VARS="vars/global/cgroup_tiering.yml"

managed_worker_vms=(
  "kvm-worker-01"
  "kvm-worker-02"
  "kvm-worker-03"
)

require_sudo() {
  if [[ "${EUID}" -ne 0 ]]; then
    sudo -v
  fi
}

run_root() {
  if [[ "${EUID}" -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

yaml_scalar() {
  local file="$1"
  local key="$2"
  awk -F': ' -v key="${key}" '
    $1 ~ "^[[:space:]]*" key "$" {
      gsub(/"/, "", $2)
      print $2
      exit
    }
  ' "${file}"
}

host_reserved_cpus() { yaml_scalar "${HOST_RESOURCE_VARS}" "host_reserved"; }
host_housekeeping_cpus() { yaml_scalar "${HOST_RESOURCE_VARS}" "host_housekeeping"; }
host_emulator_cpus() { yaml_scalar "${HOST_RESOURCE_VARS}" "host_emulator"; }
guest_domain_cpus() { yaml_scalar "${HOST_RESOURCE_VARS}" "guest_domain"; }
tier_cpu_weight() {
  local tier="$1"
  awk -v tier="${tier}" '
    $0 ~ "^    " tier ":" { in_tier=1; next }
    in_tier && $0 ~ "^      cpu_weight:" { print $2; exit }
    in_tier && $0 ~ "^    [^ ]" { exit }
  ' FS=': ' "${HOST_RESOURCE_VARS}"
}
gold_cpu_weight() { tier_cpu_weight gold; }
silver_cpu_weight() { tier_cpu_weight silver; }
bronze_cpu_weight() { tier_cpu_weight bronze; }

memory_zram_device() { yaml_scalar "${HOST_MEMORY_VARS}" "device_name"; }
memory_zram_size() { yaml_scalar "${HOST_MEMORY_VARS}" "size"; }
memory_zram_algo() { yaml_scalar "${HOST_MEMORY_VARS}" "compression_algorithm"; }
memory_thp_mode() { awk -F': ' '/^[[:space:]]+mode:/ {gsub(/"/, "", $2); print $2; exit}' "${HOST_MEMORY_VARS}"; }
memory_thp_defrag_mode() { awk -F': ' '/^[[:space:]]+defrag_mode:/ {gsub(/"/, "", $2); print $2; exit}' "${HOST_MEMORY_VARS}"; }
memory_ksm_run() { awk -F': ' '/^[[:space:]]+run:/ {print $2; exit}' "${HOST_MEMORY_VARS}"; }
memory_ksm_pages_to_scan() { awk -F': ' '/^[[:space:]]+pages_to_scan:/ {print $2; exit}' "${HOST_MEMORY_VARS}"; }
memory_ksm_sleep_millisecs() { awk -F': ' '/^[[:space:]]+sleep_millisecs:/ {print $2; exit}' "${HOST_MEMORY_VARS}"; }

clock_vm_vcpu_cpuset() {
  local vm="$1"
  awk -v vm="${vm}" '
    $0 ~ "^    " vm ":" { in_vm=1; next }
    in_vm && $0 ~ "^      vcpu_cpuset:" { gsub(/"/, "", $2); print $2; exit }
    in_vm && $0 ~ "^    [^ ]" { exit }
  ' FS=': ' "${CGROUP_TIERING_VARS}"
}

clock_vm_emulator_cpuset() {
  local vm="$1"
  awk -v vm="${vm}" '
    $0 ~ "^    " vm ":" { in_vm=1; next }
    in_vm && $0 ~ "^      emulator_cpuset:" { gsub(/"/, "", $2); print $2; exit }
    in_vm && $0 ~ "^    [^ ]" { exit }
  ' FS=': ' "${CGROUP_TIERING_VARS}"
}

clock_vm_scaling_max_freq() {
  local vm="$1"
  awk -v vm="${vm}" '
    $0 ~ "^    " vm ":" { in_vm=1; next }
    in_vm && $0 ~ "^      scaling_max_freq_khz:" { print $2; exit }
    in_vm && $0 ~ "^    [^ ]" { exit }
  ' FS=': ' "${CGROUP_TIERING_VARS}"
}

vm_tier() {
  case "$1" in
    kvm-worker-01) printf '%s\n' "gold" ;;
    kvm-worker-02) printf '%s\n' "silver" ;;
    kvm-worker-03) printf '%s\n' "bronze" ;;
    *) printf '%s\n' "unknown" ;;
  esac
}

vm_target_weight() {
  case "$(vm_tier "$1")" in
    gold) gold_cpu_weight ;;
    silver) silver_cpu_weight ;;
    bronze) bronze_cpu_weight ;;
    *) printf '%s\n' "" ;;
  esac
}

vm_scope_hint() {
  case "$1" in
    kvm-worker-01) printf '%s\n' 'machine-qemu\x2d21\x2dkvm\x2dworker\x2d01.scope' ;;
    kvm-worker-02) printf '%s\n' 'machine-qemu\x2d22\x2dkvm\x2dworker\x2d02.scope' ;;
    kvm-worker-03) printf '%s\n' 'machine-qemu\x2d23\x2dkvm\x2dworker\x2d03.scope' ;;
    *) printf '%s\n' "" ;;
  esac
}

scope_exists() {
  local scope="$1"
  run_root systemctl show "${scope}" >/dev/null 2>&1
}

scope_prop_value() {
  local scope="$1"
  local prop="$2"
  run_root systemctl show "${scope}" -p "${prop}" --value 2>/dev/null || true
}

virsh_vcpu_unique_cpuset() {
  local vm="$1"
  run_root virsh vcpupin "${vm}" 2>/dev/null | awk 'NR > 2 && $1 ~ /^[0-9]+$/ {print $2}' | sort -u | paste -sd',' -
}

virsh_emulator_cpuset() {
  local vm="$1"
  run_root virsh emulatorpin "${vm}" 2>/dev/null | awk '$1 == "*:" {print $2; exit}'
}

cpuset_has_value() {
  local current="$1"
  local expected="$2"
  [[ ",${current}," == *",${expected},"* ]]
}

show_host_resource_management_status() {
  require_sudo
  local host_reserved host_housekeeping host_emulator guest_domain gold_weight silver_weight bronze_weight
  local manager_dropin="/etc/systemd/system.conf.d/90-stakkr-host-resource-management.conf"
  local gold_slice="/etc/systemd/system/machine-gold.slice"
  local silver_slice="/etc/systemd/system/machine-silver.slice"
  local bronze_slice="/etc/systemd/system/machine-bronze.slice"
  local irqbalance_cfg="/etc/sysconfig/irqbalance"
  local state="not applied"

  host_reserved="$(host_reserved_cpus)"
  host_housekeeping="$(host_housekeeping_cpus)"
  host_emulator="$(host_emulator_cpus)"
  guest_domain="$(guest_domain_cpus)"
  gold_weight="$(gold_cpu_weight)"
  silver_weight="$(silver_cpu_weight)"
  bronze_weight="$(bronze_cpu_weight)"

  printf 'Configured target policy\n'
  printf '  Host reserved CPUs: %s\n' "${host_reserved}"
  printf '  Host housekeeping CPUs: %s\n' "${host_housekeeping}"
  printf '  Host emulator CPUs: %s\n' "${host_emulator}"
  printf '  Guest-domain CPUs: %s\n' "${guest_domain}"
  printf '  Gold CPUWeight: %s\n' "${gold_weight}"
  printf '  Silver CPUWeight: %s\n' "${silver_weight}"
  printf '  Bronze CPUWeight: %s\n' "${bronze_weight}"
  printf '\n'

  local present=0
  [[ -f "${manager_dropin}" ]] && ((present+=1))
  [[ -f "${gold_slice}" ]] && ((present+=1))
  [[ -f "${silver_slice}" ]] && ((present+=1))
  [[ -f "${bronze_slice}" ]] && ((present+=1))
  if [[ "${present}" -eq 4 ]]; then
    state="active"
  elif [[ "${present}" -gt 0 ]]; then
    state="partial"
  fi

  printf 'Live host resource management state: %s\n' "${state}"
  printf '  Manager CPUAffinity drop-in: %s\n' "$([[ -f "${manager_dropin}" ]] && printf 'present' || printf 'absent')"
  printf '  Gold slice: %s\n' "$([[ -f "${gold_slice}" ]] && printf 'present' || printf 'absent')"
  printf '  Silver slice: %s\n' "$([[ -f "${silver_slice}" ]] && printf 'present' || printf 'absent')"
  printf '  Bronze slice: %s\n' "$([[ -f "${bronze_slice}" ]] && printf 'present' || printf 'absent')"
  if [[ -f "${irqbalance_cfg}" ]] && grep -q '^IRQBALANCE_BANNED_CPULIST=' "${irqbalance_cfg}"; then
    printf '  irqbalance guest-domain exclusion: %s\n' "$(grep '^IRQBALANCE_BANNED_CPULIST=' "${irqbalance_cfg}")"
  else
    printf '  irqbalance guest-domain exclusion: not set\n'
  fi
}

show_host_memory_oversubscription_status() {
  require_sudo
  local service="stakkr-host-memory-oversubscription.service"
  local zram_device zram_active thp_enabled thp_defrag
  zram_device="$(memory_zram_device)"
  zram_active="no"
  [[ -e "/sys/block/${zram_device}" ]] && zram_active="yes"
  thp_enabled="$(< /sys/kernel/mm/transparent_hugepage/enabled)"
  thp_defrag="$(< /sys/kernel/mm/transparent_hugepage/defrag)"

  printf 'Configured target policy\n'
  printf '  zram device: %s\n' "${zram_device}"
  printf '  zram size: %s\n' "$(memory_zram_size)"
  printf '  zram compression algorithm: %s\n' "$(memory_zram_algo)"
  printf '  THP mode: %s\n' "$(memory_thp_mode)"
  printf '  THP defrag mode: %s\n' "$(memory_thp_defrag_mode)"
  printf '  KSM run: %s\n' "$(memory_ksm_run)"
  printf '  KSM pages_to_scan: %s\n' "$(memory_ksm_pages_to_scan)"
  printf '  KSM sleep_millisecs: %s\n' "$(memory_ksm_sleep_millisecs)"
  printf '\n'

  printf 'Live host memory oversubscription state\n'
  printf '  Memory policy service enabled: %s\n' "$(run_root systemctl is-enabled "${service}" 2>/dev/null || printf 'not-found')"
  printf '  Memory policy service active: %s\n' "$(run_root systemctl is-active "${service}" 2>/dev/null || printf 'inactive')"
  printf '  zram active: %s\n' "${zram_active}"
  printf '  THP enabled: %s\n' "${thp_enabled}"
  printf '  THP defrag: %s\n' "${thp_defrag}"
  printf '  KSM run: %s\n' "$(< /sys/kernel/mm/ksm/run)"
  printf '  KSM pages_to_scan: %s\n' "$(< /sys/kernel/mm/ksm/pages_to_scan)"
  printf '  KSM sleep_millisecs: %s\n' "$(< /sys/kernel/mm/ksm/sleep_millisecs)"
}

detect_shared_execution_pool_state() {
  local guest_domain host_emulator ok=1
  guest_domain="$(guest_domain_cpus)"
  host_emulator="$(host_emulator_cpus)"
  for vm in "${managed_worker_vms[@]}"; do
    local scope current_weight current_vcpu current_emulator
    scope="$(vm_scope_hint "${vm}")"
    current_weight="$(scope_prop_value "${scope}" CPUWeight)"
    current_vcpu="$(virsh_vcpu_unique_cpuset "${vm}")"
    current_emulator="$(virsh_emulator_cpuset "${vm}")"
    [[ "${current_weight}" == "$(vm_target_weight "${vm}")" ]] || ok=0
    cpuset_has_value "${current_vcpu}" "${guest_domain}" || ok=0
    [[ "${current_emulator}" == "${host_emulator}" ]] || ok=0
  done
  [[ "${ok}" -eq 1 ]] && printf '%s\n' "shared execution pool" || printf '%s\n' "mixed"
}

detect_stock_state() {
  local ok=1
  for vm in "${managed_worker_vms[@]}"; do
    local scope current_weight current_vcpu current_emulator
    scope="$(vm_scope_hint "${vm}")"
    current_weight="$(scope_prop_value "${scope}" CPUWeight)"
    current_vcpu="$(virsh_vcpu_unique_cpuset "${vm}")"
    current_emulator="$(virsh_emulator_cpuset "${vm}")"
    [[ -z "${current_weight}" ]] || ok=0
    cpuset_has_value "${current_vcpu}" "0-11" || ok=0
    [[ "${current_emulator}" == "0-11" ]] || ok=0
  done
  [[ "${ok}" -eq 1 ]] && printf '%s\n' "stock" || printf '%s\n' ""
}

detect_clock_state() {
  local ok=1
  for vm in "${managed_worker_vms[@]}"; do
    local current_vcpu current_emulator
    current_vcpu="$(virsh_vcpu_unique_cpuset "${vm}")"
    current_emulator="$(virsh_emulator_cpuset "${vm}")"
    cpuset_has_value "${current_vcpu}" "$(clock_vm_vcpu_cpuset "${vm}")" || ok=0
    [[ "${current_emulator}" == "$(clock_vm_emulator_cpuset "${vm}")" ]] || ok=0
  done
  [[ "${ok}" -eq 1 ]] && printf '%s\n' "clock-tiering" || printf '%s\n' ""
}

show_shared_execution_pool_status() {
  require_sudo
  local host_emulator guest_domain state note
  host_emulator="$(host_emulator_cpus)"
  guest_domain="$(guest_domain_cpus)"
  state="$(detect_shared_execution_pool_state)"
  if [[ "${state}" == "mixed" ]]; then
    local stock_state clock_state
    stock_state="$(detect_stock_state)"
    clock_state="$(detect_clock_state)"
    [[ -n "${stock_state}" ]] && state="${stock_state}"
    [[ -n "${clock_state}" ]] && state="${clock_state}"
  fi
  case "${state}" in
    "shared execution pool") note="Guest vCPUs share CPUs ${guest_domain}, emulator threads stay on ${host_emulator}, and Gold/Silver/Bronze weights are live." ;;
    "clock-tiering") note="Managed workers are using dedicated CPU lanes and fixed clock ceilings." ;;
    "stock") note="Managed workers are using stock VM pinning and no live Stakkr contention weights." ;;
    *) note="Managed workers are in a mixed state. Inspect the raw VM scope and pinning details below." ;;
  esac

  printf 'Current state: %s\n' "${state}"
  printf '%s\n' "${note}"
  printf '\n'

  for vm in "${managed_worker_vms[@]}"; do
    local scope current_weight allowed_cpus vcpu_cpuset emulator_cpuset
    scope="$(vm_scope_hint "${vm}")"
    current_weight="$(scope_prop_value "${scope}" CPUWeight)"
    allowed_cpus="$(scope_prop_value "${scope}" AllowedCPUs)"
    vcpu_cpuset="$(virsh_vcpu_unique_cpuset "${vm}")"
    emulator_cpuset="$(virsh_emulator_cpuset "${vm}")"

    printf 'VM: %s\n' "${vm}"
    printf '  Scope: %s\n' "${scope}"
    printf '  CPUWeight: %s\n' "${current_weight:-[not set]}"
    printf '  AllowedCPUs: %s\n' "${allowed_cpus}"
    printf '  Current vCPU cpuset: %s\n' "${vcpu_cpuset}"
    printf '  Current emulator cpuset: %s\n' "${emulator_cpuset}"
    printf '\n'

    run_root virsh vcpupin "${vm}" 2>/dev/null || true
    printf '\n'
    run_root virsh emulatorpin "${vm}" 2>/dev/null || true
    printf '\n'
  done
}

show_contention_status() {
  require_sudo
  for vm in "${managed_worker_vms[@]}"; do
    local tier target_weight scope current_weight allowed_cpus
    tier="$(vm_tier "${vm}")"
    target_weight="$(vm_target_weight "${vm}")"
    scope="$(vm_scope_hint "${vm}")"
    current_weight="$(scope_prop_value "${scope}" CPUWeight)"
    allowed_cpus="$(scope_prop_value "${scope}" AllowedCPUs)"
    printf 'VM: %s\n' "${vm}"
    printf '  Tier: %s\n' "${tier}"
    printf '  Target CPUWeight: %s\n' "${target_weight}"
    printf '  CPUWeight=%s | AllowedCPUs=%s\n' "${current_weight:-[not set]}" "${allowed_cpus}"
    printf '\n'
  done
}

show_clock_status() {
  require_sudo
  for vm in "${managed_worker_vms[@]}"; do
    printf 'VM: %s\n' "${vm}"
    printf '  Target vCPU cpuset: %s\n' "$(clock_vm_vcpu_cpuset "${vm}")"
    printf '  Target emulator cpuset: %s\n' "$(clock_vm_emulator_cpuset "${vm}")"
    printf '  Target max frequency: %s kHz\n' "$(clock_vm_scaling_max_freq "${vm}")"
    printf '\n'
    run_root virsh vcpupin "${vm}" 2>/dev/null || true
    printf '\n'
    run_root virsh emulatorpin "${vm}" 2>/dev/null || true
    printf '\n'
  done

  for cpu in $(seq 0 11); do
    local current_max hardware_max
    current_max="$(< "/sys/devices/system/cpu/cpu${cpu}/cpufreq/scaling_max_freq")"
    hardware_max="$(< "/sys/devices/system/cpu/cpu${cpu}/cpufreq/cpuinfo_max_freq")"
    printf 'CPU %s: current max=%s | hardware max=%s\n' "${cpu}" "${current_max}" "${hardware_max}"
  done
}

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
  host-resource-management.sh <action> [ansible-playbook args]

actions:
  host-resource-management-apply
  host-resource-management-rollback
  host-resource-management-status
  host-memory-oversubscription-apply
  host-memory-oversubscription-rollback
  host-memory-oversubscription-status
  shared-execution-pool-apply
  shared-execution-pool-rollback
  shared-execution-pool-status
  contention-status
  contention-apply
  contention-rollback
  clock-status
  clock-apply
  clock-rollback

legacy aliases:
  apply
  rollback
  status

examples:
  host-resource-management.sh contention-status
  host-resource-management.sh shared-execution-pool-status
  host-resource-management.sh shared-execution-pool-apply --ask-vault-pass
EOF
}

if [[ $# -lt 1 ]]; then
  usage
  exit 64
fi

ACTION="$1"
shift
EXTRA_ARGS=("$@")

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${PROJECT_ROOT}"

case "${ACTION}" in
  host-resource-management-apply)
    ansible_playbook \
      playbooks/maintenance/host-resource-management-apply.yml \
      "${EXTRA_ARGS[@]}"
    ;;
  host-resource-management-rollback)
    ansible_playbook \
      playbooks/maintenance/host-resource-management-rollback.yml \
      "${EXTRA_ARGS[@]}"
    ;;
  host-resource-management-status)
    show_host_resource_management_status
    ;;
  host-memory-oversubscription-apply)
    ansible_playbook \
      playbooks/maintenance/host-memory-oversubscription-apply.yml \
      "${EXTRA_ARGS[@]}"
    ;;
  host-memory-oversubscription-rollback)
    ansible_playbook \
      playbooks/maintenance/host-memory-oversubscription-rollback.yml \
      "${EXTRA_ARGS[@]}"
    ;;
  host-memory-oversubscription-status)
    show_host_memory_oversubscription_status
    ;;
  shared-execution-pool-status|status)
    show_shared_execution_pool_status
    ;;
  shared-execution-pool-apply|apply)
    ansible_playbook \
      playbooks/maintenance/cgroup-tiering-apply-v1.yml \
      "${EXTRA_ARGS[@]}"
    ansible_playbook \
      playbooks/maintenance/contention-tiering-apply-v1.yml \
      "${EXTRA_ARGS[@]}"
    ;;
  shared-execution-pool-rollback|rollback)
    ansible_playbook \
      playbooks/maintenance/contention-tiering-rollback-v1.yml \
      "${EXTRA_ARGS[@]}"
    ansible_playbook \
      playbooks/maintenance/cgroup-tiering-rollback-v1.yml \
      "${EXTRA_ARGS[@]}"
    ;;
  contention-status)
    show_contention_status
    ;;
  contention-apply)
    ansible_playbook \
      playbooks/maintenance/contention-tiering-apply-v1.yml \
      "${EXTRA_ARGS[@]}"
    ;;
  contention-rollback)
    ansible_playbook \
      playbooks/maintenance/contention-tiering-rollback-v1.yml \
      "${EXTRA_ARGS[@]}"
    ;;
  clock-status)
    show_clock_status
    ;;
  clock-apply)
    ansible_playbook \
      playbooks/maintenance/clock-frequency-tiering-apply-v1.yml \
      "${EXTRA_ARGS[@]}"
    ;;
  clock-rollback)
    ansible_playbook \
      playbooks/maintenance/clock-frequency-tiering-rollback-v1.yml \
      "${EXTRA_ARGS[@]}"
    ;;
  *)
    usage
    exit 64
    ;;
esac
