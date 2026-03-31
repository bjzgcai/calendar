#!/usr/bin/env bash
set -euo pipefail

readonly DEFAULT_BASE_URL="http://39.97.62.60:3000/api"
readonly DEFAULT_CLIENT_ID="internal-codex"
readonly DEFAULT_ALLOWED_IPS="219.142.122.2,125.35.71.202,125.35.71.206,42.247.105.2"

ALLOWED_IPS=()

usage() {
  cat <<'USAGE'
Usage:
  query_availability.sh [--source-ip <ipv4>] [--check-ip-only] <payload-json-file> [base-url] [client-id]

Defaults:
  base-url    : $AVAILABILITY_BASE_URL or http://39.97.62.60:3000/api
  client-id   : $AVAILABILITY_CLIENT_ID or internal-codex
  allowlist   : $AVAILABILITY_ALLOWED_IPS or 219.142.122.2,125.35.71.202,125.35.71.206,42.247.105.2
  source-ip   : auto-detected egress/public IP (fallback: local interface IP)

This helper intentionally sends NO auth credentials.
It is for trusted internal environments only and enforces an IP allowlist.

Options:
  --source-ip <ipv4>  Override detected source IP (useful for testing)
  --check-ip-only     Validate source IP allowlist and exit without calling API
USAGE
}

load_allowlist() {
  local raw_allowlist
  raw_allowlist="${AVAILABILITY_ALLOWED_IPS:-$DEFAULT_ALLOWED_IPS}"
  IFS=',' read -r -a ALLOWED_IPS <<<"$raw_allowlist"
  for i in "${!ALLOWED_IPS[@]}"; do
    ALLOWED_IPS[$i]="$(echo "${ALLOWED_IPS[$i]}" | tr -d '[:space:]')"
  done
}

is_valid_ipv4() {
  local ip="$1"
  [[ "$ip" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]
}

is_ip_allowed() {
  local target_ip="$1"
  local allowed_ip
  for allowed_ip in "${ALLOWED_IPS[@]}"; do
    if [[ "$target_ip" == "$allowed_ip" ]]; then
      return 0
    fi
  done
  return 1
}

detect_source_ip() {
  local source_ip="" candidate=""

  if [[ -n "${SOURCE_IP_OVERRIDE:-}" ]]; then
    echo "$SOURCE_IP_OVERRIDE"
    return 0
  fi

  if command -v curl >/dev/null 2>&1; then
    for url in "https://api.ipify.org" "https://ifconfig.me/ip"; do
      candidate="$(curl -fsS --max-time 5 "$url" 2>/dev/null | tr -d '[:space:]' || true)"
      if is_valid_ipv4 "$candidate"; then
        source_ip="$candidate"
        break
      fi
    done
  fi

  if [[ -z "$source_ip" ]] && command -v ip >/dev/null 2>&1; then
    candidate="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i=1; i<=NF; i++) if ($i=="src") {print $(i+1); exit}}')"
    if is_valid_ipv4 "$candidate"; then
      source_ip="$candidate"
    fi
  fi

  if [[ -z "$source_ip" ]] && command -v hostname >/dev/null 2>&1; then
    candidate="$(hostname -I 2>/dev/null | awk '{print $1}')"
    if is_valid_ipv4 "$candidate"; then
      source_ip="$candidate"
    fi
  fi

  echo "$source_ip"
}

validate_source_ip() {
  local source_ip="$1"
  if [[ -z "$source_ip" ]]; then
    echo "Unable to determine source IP. Set AVAILABILITY_SOURCE_IP or pass --source-ip." >&2
    exit 1
  fi

  if ! is_ip_allowed "$source_ip"; then
    echo "Access denied: source IP $source_ip is not allowlisted for this skill." >&2
    echo "Allowlisted egress IPs: ${ALLOWED_IPS[*]}" >&2
    exit 1
  fi

  echo "Source IP validated: $source_ip" >&2
}

SOURCE_IP_OVERRIDE="${AVAILABILITY_SOURCE_IP:-}"
CHECK_IP_ONLY=0
POSITIONAL_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --source-ip)
      if [[ $# -lt 2 ]]; then
        echo "--source-ip requires an IPv4 argument." >&2
        exit 1
      fi
      SOURCE_IP_OVERRIDE="$2"
      shift 2
      ;;
    --check-ip-only)
      CHECK_IP_ONLY=1
      shift
      ;;
    --)
      shift
      while [[ $# -gt 0 ]]; do
        POSITIONAL_ARGS+=("$1")
        shift
      done
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
    *)
      POSITIONAL_ARGS+=("$1")
      shift
      ;;
  esac
done

set -- "${POSITIONAL_ARGS[@]}"

if [[ "$CHECK_IP_ONLY" -eq 0 && $# -lt 1 ]]; then
  usage >&2
  exit 1
fi

load_allowlist
detected_source_ip="$(detect_source_ip)"
validate_source_ip "$detected_source_ip"

if [[ "$CHECK_IP_ONLY" -eq 1 ]]; then
  exit 0
fi

payload_file="$1"
base_url="${2:-${AVAILABILITY_BASE_URL:-$DEFAULT_BASE_URL}}"
client_id="${3:-${AVAILABILITY_CLIENT_ID:-$DEFAULT_CLIENT_ID}}"
endpoint="${base_url%/}/availability/query"

if [[ ! -f "$payload_file" ]]; then
  echo "Payload file not found: $payload_file" >&2
  exit 1
fi

if command -v jq >/dev/null 2>&1; then
  jq empty "$payload_file" >/dev/null
fi

tmp_headers="$(mktemp)"
tmp_body="$(mktemp)"
cleanup() {
  rm -f "$tmp_headers" "$tmp_body"
}
trap cleanup EXIT

http_code="$({
  curl -sS \
    -o "$tmp_body" \
    -D "$tmp_headers" \
    -w "%{http_code}" \
    -X POST "$endpoint" \
    -H "Content-Type: application/json" \
    -H "x-client-id: $client_id" \
    --data-binary "@$payload_file"
} )"

cat "$tmp_body"

echo >&2
echo "HTTP $http_code" >&2
for header in X-RateLimit-Limit X-RateLimit-Remaining X-RateLimit-Reset Retry-After; do
  value="$(grep -i "^${header}:" "$tmp_headers" | tail -n 1 | cut -d':' -f2- | tr -d '\r' | xargs || true)"
  if [[ -n "$value" ]]; then
    echo "$header: $value" >&2
  fi
done

if [[ "$http_code" -ge 400 ]]; then
  exit 1
fi
