#!/usr/bin/env bash

PRODUCTION_SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
PROJECT_ROOT="$(cd -- "$PRODUCTION_SCRIPT_DIR/.." && pwd -P)"

die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

info() {
  printf '==> %s\n' "$*"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

dotenv_value() {
  local key="$1"
  local fallback="${2-}"
  local line=''
  local value=''

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    if [[ "$line" == "$key="* ]]; then
      value="${line#*=}"
    fi
  done < "$ENV_FILE"

  if [[ -z "$value" ]]; then
    value="$fallback"
  fi

  if [[ ${#value} -ge 2 ]]; then
    if [[ "${value:0:1}" == '"' && "${value: -1}" == '"' ]]; then
      value="${value:1:${#value}-2}"
    elif [[ "${value:0:1}" == "'" && "${value: -1}" == "'" ]]; then
      value="${value:1:${#value}-2}"
    fi
  fi

  printf '%s' "$value"
}

validate_resource_name() {
  local label="$1"
  local value="$2"
  [[ "$value" =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]*$ ]] || die "$label contains unsupported characters: $value"
}

configure_production() {
  local requested_env_file="$1"

  require_command docker
  docker compose version >/dev/null 2>&1 || die 'Docker Compose v2 is required.'

  [[ -f "$requested_env_file" ]] || die "Environment file not found: $requested_env_file"
  ENV_FILE="$(cd -- "$(dirname -- "$requested_env_file")" && pwd -P)/$(basename -- "$requested_env_file")"

  INFRA_PROJECT="$(dotenv_value NEWSLETTER_INFRA_PROJECT newsletter-alpha-infra)"
  APP_PROJECT="$(dotenv_value NEWSLETTER_APP_PROJECT newsletter-alpha-app)"
  INTERNAL_NETWORK="$(dotenv_value NEWSLETTER_INTERNAL_NETWORK)"
  POSTGRES_VOLUME="$(dotenv_value POSTGRES_DATA_VOLUME)"
  MINIO_VOLUME="$(dotenv_value MINIO_DATA_VOLUME)"

  [[ -n "$INTERNAL_NETWORK" ]] || die 'NEWSLETTER_INTERNAL_NETWORK is missing in the environment file.'
  [[ -n "$POSTGRES_VOLUME" ]] || die 'POSTGRES_DATA_VOLUME is missing in the environment file.'
  [[ -n "$MINIO_VOLUME" ]] || die 'MINIO_DATA_VOLUME is missing in the environment file.'

  validate_resource_name NEWSLETTER_INFRA_PROJECT "$INFRA_PROJECT"
  validate_resource_name NEWSLETTER_APP_PROJECT "$APP_PROJECT"
  validate_resource_name NEWSLETTER_INTERNAL_NETWORK "$INTERNAL_NETWORK"
  validate_resource_name POSTGRES_DATA_VOLUME "$POSTGRES_VOLUME"
  validate_resource_name MINIO_DATA_VOLUME "$MINIO_VOLUME"

  INFRA_COMPOSE=(
    docker compose
    --env-file "$ENV_FILE"
    --project-name "$INFRA_PROJECT"
    --file "$PROJECT_ROOT/docker-compose.infra.yml"
  )
  APP_COMPOSE=(
    docker compose
    --env-file "$ENV_FILE"
    --project-name "$APP_PROJECT"
    --file "$PROJECT_ROOT/docker-compose.prod.yml"
  )
}

validate_compose_files() {
  "${INFRA_COMPOSE[@]}" config --quiet
  "${APP_COMPOSE[@]}" config --quiet
}

ensure_infrastructure_healthy() {
  local service=''
  local container_id=''
  local health=''

  for service in db minio; do
    container_id="$("${INFRA_COMPOSE[@]}" ps --status running --quiet "$service")"
    [[ -n "$container_id" ]] || die "Infrastructure service is not running: $service"
    health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id")"
    [[ "$health" == healthy ]] || die "Infrastructure service is not healthy: $service ($health)"
  done
}

validate_production_image() {
  local image="$1"
  docker image inspect "$image" >/dev/null 2>&1 || die "Production application image is not available locally: $image"
  docker run --rm --entrypoint /bin/sh "$image" -c \
    'test -f /app/.next/BUILD_ID && test -x /app/node_modules/.bin/next && test -x /app/node_modules/.bin/tsx && test -f /app/scripts/migrate.ts && test -f /app/scripts/run-audit-cleanup.sh && test -f /app/package.json' \
    || die "Image is not a complete newsletter-tool production image: $image"
}

prepare_backup_root() {
  local requested_root="$1"
  [[ -n "$requested_root" ]] || die 'A backup directory is required.'
  [[ "$requested_root" != / ]] || die 'The filesystem root cannot be used as backup directory.'

  [[ -d "$requested_root" ]] || die "Backup directory does not exist. Create or mount it deliberately before continuing: $requested_root"
  [[ -w "$requested_root" ]] || die "Backup directory is not writable: $requested_root"
  BACKUP_ROOT="$(cd -- "$requested_root" && pwd -P)"
  if [[ "$BACKUP_ROOT" == "$PROJECT_ROOT" || "$BACKUP_ROOT" == "$PROJECT_ROOT/"* ]]; then
    die 'Backups must be stored outside the application checkout.'
  fi
}

checksum_create() {
  local directory="$1"
  shift
  if command -v sha256sum >/dev/null 2>&1; then
    (cd -- "$directory" && sha256sum "$@")
  elif command -v shasum >/dev/null 2>&1; then
    (cd -- "$directory" && shasum -a 256 "$@")
  else
    die 'sha256sum or shasum is required.'
  fi
}

checksum_verify() {
  local directory="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    (cd -- "$directory" && sha256sum --check SHA256SUMS)
  elif command -v shasum >/dev/null 2>&1; then
    (cd -- "$directory" && shasum -a 256 --check SHA256SUMS)
  else
    die 'sha256sum or shasum is required.'
  fi
}
