#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=./_production-common.sh
source "$SCRIPT_DIR/_production-common.sh"

env_file="$PROJECT_ROOT/.env.production"

usage() {
  cat <<'EOF'
Usage: ./scripts/start-production.sh [options]

Options:
  --env-file PATH  Production environment file (default: .env.production)
  --help           Show this help

Starts existing infrastructure, runs idempotent initialization and migrations,
then starts the application. It never creates missing data volumes.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      [[ $# -ge 2 ]] || die '--env-file requires a path.'
      env_file="$2"
      shift 2
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
app_image="$(dotenv_value APP_IMAGE newsletter-tool:production)"

docker volume inspect "$POSTGRES_VOLUME" >/dev/null 2>&1 || die "PostgreSQL volume is missing: $POSTGRES_VOLUME"
docker volume inspect "$MINIO_VOLUME" >/dev/null 2>&1 || die "MinIO volume is missing: $MINIO_VOLUME"
docker network inspect "$INTERNAL_NETWORK" >/dev/null 2>&1 || die "Internal network is missing: $INTERNAL_NETWORK"
validate_production_image "$app_image"

info 'Starting persistent infrastructure and waiting for health checks'
"${INFRA_COMPOSE[@]}" up --detach --wait --wait-timeout 120
ensure_infrastructure_healthy

info 'Running idempotent initialization and migrations'
"${APP_COMPOSE[@]}" run --rm --no-deps createbucket
"${APP_COMPOSE[@]}" run --rm --no-deps migrate
"${APP_COMPOSE[@]}" run --rm --no-deps bootstrap-admin

info 'Starting application containers and waiting for health checks'
"${APP_COMPOSE[@]}" up \
  --detach \
  --no-deps \
  --wait \
  --wait-timeout 120 \
  web audit-cleanup

info 'Production services are ready.'
