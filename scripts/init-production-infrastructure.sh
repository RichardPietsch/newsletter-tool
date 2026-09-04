#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=./_production-common.sh
source "$SCRIPT_DIR/_production-common.sh"

env_file="$PROJECT_ROOT/.env.production"
create_empty_volumes=false

usage() {
  cat <<'EOF'
Usage: ./scripts/init-production-infrastructure.sh [options]

Options:
  --env-file PATH             Production environment file (default: .env.production)
  --create-empty-data-volumes
                              Explicitly allow creation of new empty data volumes
  --help                      Show this help

Without --create-empty-data-volumes the command refuses to start when either
data volume is missing. Existing installations should point the environment
variables at their existing volume names instead of creating empty volumes.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      [[ $# -ge 2 ]] || die '--env-file requires a path.'
      env_file="$2"
      shift 2
      ;;
    --create-empty-data-volumes)
      create_empty_volumes=true
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $1"
      ;;
  esac
done

configure_production "$env_file"
validate_compose_files

ensure_volume() {
  local volume_name="$1"
  local purpose="$2"
  local expected_service="$3"
  local running_containers=''
  local container_id=''
  local container_project=''
  local container_service=''

  if ! docker volume inspect "$volume_name" >/dev/null 2>&1; then
    if [[ "$create_empty_volumes" != true ]]; then
      die "Data volume '$volume_name' does not exist. Set the existing volume name in $ENV_FILE or rerun with --create-empty-data-volumes only for a deliberate empty installation."
    fi
    info "Creating empty $purpose volume: $volume_name"
    docker volume create \
      --label com.newsletter-tool.persistent=true \
      --label "com.newsletter-tool.purpose=$purpose" \
      "$volume_name" >/dev/null
  else
    info "Using existing $purpose volume: $volume_name"
  fi

  running_containers="$(docker ps --quiet --filter "volume=$volume_name")"
  for container_id in $running_containers; do
    container_project="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "$container_id")"
    container_service="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.service"}}' "$container_id")"
    if [[ "$container_project" != "$INFRA_PROJECT" || "$container_service" != "$expected_service" ]]; then
      docker ps --filter "id=$container_id" --format '{{.ID}} {{.Names}}' >&2
      die "Volume '$volume_name' is mounted by another running container. Stop the previous infrastructure container first; never run two PostgreSQL or MinIO containers against the same data volume."
    fi
  done
}

ensure_volume "$POSTGRES_VOLUME" postgres db
ensure_volume "$MINIO_VOLUME" minio minio

if ! docker network inspect "$INTERNAL_NETWORK" >/dev/null 2>&1; then
  info "Creating internal network: $INTERNAL_NETWORK"
  docker network create \
    --label com.newsletter-tool.internal=true \
    "$INTERNAL_NETWORK" >/dev/null
else
  info "Using existing internal network: $INTERNAL_NETWORK"
fi

info 'Starting persistent infrastructure and waiting for health checks'
"${INFRA_COMPOSE[@]}" up --detach --wait --wait-timeout 120
ensure_infrastructure_healthy

info 'Creating or validating the asset bucket'
"${APP_COMPOSE[@]}" run --rm --no-deps createbucket

info 'Persistent infrastructure is ready.'
