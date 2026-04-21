#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

kubectl_bin="${KUBECTL:-kubectl}"
manifest="${JACKDAW_SESSION_YML:-${script_dir}/jackdaw-session.yml}"
current_context="$("${kubectl_bin}" config current-context)"
current_namespace="${NAMESPACE:-$("${kubectl_bin}" config view --minify --output 'jsonpath={..namespace}')}"

if [ -z "${current_namespace}" ]; then
  current_namespace=default
fi

context_args=(--context "${current_context}" --namespace "${current_namespace}")

pod_name="$("${kubectl_bin}" create "${context_args[@]}" --dry-run=client -f "${manifest}" -o jsonpath='{.metadata.name}')"
image="$("${kubectl_bin}" create "${context_args[@]}" --dry-run=client -f "${manifest}" -o jsonpath='{.spec.containers[0].image}')"
overrides="$("${kubectl_bin}" create "${context_args[@]}" --dry-run=client -f "${manifest}" -o json)"

dry_run=false
for arg in "$@"; do
  case "${arg}" in
    --dry-run | --dry-run=*)
      dry_run=true
      ;;
  esac
done

if [ "${dry_run}" = true ]; then
  exec "${kubectl_bin}" run "${pod_name}" \
    "${context_args[@]}" \
    --image="${image}" \
    --restart=Never \
    --overrides="${overrides}" \
    "$@"
fi

exec "${kubectl_bin}" run "${pod_name}" \
  "${context_args[@]}" \
  --image="${image}" \
  --restart=Never \
  --overrides="${overrides}" \
  --rm \
  -it \
  "$@"
