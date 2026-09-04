#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=./_production-common.sh
source "$SCRIPT_DIR/_production-common.sh"

env_file="$PROJECT_ROOT/.env.production"
backup_root=''
use_local_base_image=false
use_prebuilt_image=false

usage() {
  cat <<'EOF'
Usage: ./scripts/deploy-production.sh --backup-dir PATH [options]

Options:
  --backup-dir PATH  Required destination for the pre-deployment backup
  --env-file PATH    Production environment file (default: .env.production)
  --use-local-base-image
                     Do not refresh Dockerfile base images from the registry
  --use-prebuilt-image
                     Deploy APP_IMAGE after it was built or pulled separately
  --help             Show this help

The script leaves PostgreSQL and MinIO running, backs up both data stores,
builds the new application image, applies migrations, and then replaces only
the stateless application containers.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --backup-dir)
      [[ $# -ge 2 ]] || die '--backup-dir requires a path.'
      backup_root="$2"
      shift 2
      ;;
    --env-file)
      [[ $# -ge 2 ]] || die '--env-file requires a path.'
      env_file="$2"
      shift 2
      ;;
    --use-local-base-image)
      use_local_base_image=true
      shift
      ;;
    --use-prebuilt-image)
      use_prebuilt_image=true
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
ensure_infrastructure_healthy
prepare_backup_root "$backup_root"
if [[ "$use_local_base_image" == true && "$use_prebuilt_image" == true ]]; then
  die '--use-local-base-image and --use-prebuilt-image cannot be combined.'
fi

info 'Creating mandatory pre-deployment backup'
"$SCRIPT_DIR/backup-production.sh" --env-file "$ENV_FILE" --backup-dir "$BACKUP_ROOT"

app_image="$(dotenv_value APP_IMAGE newsletter-tool:production)"
[[ -n "$app_image" ]] || die 'APP_IMAGE must not be empty.'
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
git_revision="$(git -C "$PROJECT_ROOT" rev-parse --short=12 HEAD 2>/dev/null || printf unknown)"
release_tag="newsletter-tool-release:${git_revision}-${timestamp}"
rollback_tag=''
current_web_id="$("${APP_COMPOSE[@]}" ps --status running --quiet web 2>/dev/null || true)"

if [[ -n "$current_web_id" ]]; then
  current_image_id="$(docker inspect --format '{{.Image}}' "$current_web_id")"
  rollback_tag="newsletter-tool-rollback:$timestamp"
  docker tag "$current_image_id" "$rollback_tag"
  info "Preserved the currently running application image as $rollback_tag"
fi

if [[ "$use_prebuilt_image" == true ]]; then
  info "Using prebuilt application image $app_image"
else
  info "Building application image $app_image"
  if [[ "$use_local_base_image" == true ]]; then
    "${APP_COMPOSE[@]}" build web
  else
    "${APP_COMPOSE[@]}" build --pull web
  fi
fi

info 'Validating the production image before database migration'
validate_production_image "$app_image"
docker tag "$app_image" "$release_tag"

info 'Creating or validating the asset bucket'
"${APP_COMPOSE[@]}" run --rm --no-deps createbucket

info 'Applying versioned database migrations while the current web container remains online'
"${APP_COMPOSE[@]}" run --rm --no-deps migrate

info 'Validating the one-time administrator bootstrap state'
"${APP_COMPOSE[@]}" run --rm --no-deps bootstrap-admin

info 'Replacing only the stateless application containers'
if ! "${APP_COMPOSE[@]}" up \
  --detach \
  --no-deps \
  --force-recreate \
  --wait \
  --wait-timeout 120 \
  web audit-cleanup; then
  if [[ -n "$rollback_tag" ]]; then
    info "Deployment health check failed; restoring application image $rollback_tag"
    docker tag "$rollback_tag" "$app_image"
    "${APP_COMPOSE[@]}" up \
      --detach \
      --no-deps \
      --force-recreate \
      --wait \
      --wait-timeout 120 \
      web audit-cleanup
    die "Deployment failed and the previous application image was restored. Database migrations remain applied and must stay backward-compatible. Failed image: $release_tag"
  fi
  die "Deployment failed and no previous web image was available for rollback. Failed image: $release_tag"
fi

info "Deployment completed successfully. Release image: $release_tag"
if [[ -n "$rollback_tag" ]]; then
  info "Rollback image retained locally: $rollback_tag"
fi
