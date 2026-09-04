#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=./_production-common.sh
source "$SCRIPT_DIR/_production-common.sh"

env_file="$PROJECT_ROOT/.env.production"
backup_directory=''
safety_backup_root=''
confirmation=''
restore_assets_directory=''

usage() {
  cat <<'EOF'
Usage: ./scripts/restore-production.sh [options]

Required options:
  --backup PATH              Backup directory containing database.dump
  --safety-backup-dir PATH   Destination for a fresh backup of the current state
  --confirm RESTORE-NEWSLETTER-DATA
                             Explicit destructive-operation confirmation

Optional:
  --env-file PATH            Production environment file (default: .env.production)
  --help                     Show this help

The application containers are stopped before restoration. PostgreSQL and
MinIO remain online. Assets from the backup overwrite matching objects but do
not delete newer unreferenced objects.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --backup)
      [[ $# -ge 2 ]] || die '--backup requires a path.'
      backup_directory="$2"
      shift 2
      ;;
    --safety-backup-dir)
      [[ $# -ge 2 ]] || die '--safety-backup-dir requires a path.'
      safety_backup_root="$2"
      shift 2
      ;;
    --confirm)
      [[ $# -ge 2 ]] || die '--confirm requires the documented confirmation phrase.'
      confirmation="$2"
      shift 2
      ;;
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

[[ "$confirmation" == RESTORE-NEWSLETTER-DATA ]] || die 'Restore confirmation is missing or incorrect.'
[[ -d "$backup_directory" ]] || die "Backup directory not found: $backup_directory"
backup_directory="$(cd -- "$backup_directory" && pwd -P)"
[[ -f "$backup_directory/database.dump" ]] || die 'database.dump is missing from the backup.'
[[ -f "$backup_directory/assets.tar.gz" ]] || die 'assets.tar.gz is missing from the backup.'
[[ -f "$backup_directory/MANIFEST.txt" ]] || die 'MANIFEST.txt is missing from the backup.'
[[ -f "$backup_directory/SHA256SUMS" ]] || die 'SHA256SUMS is missing from the backup.'

configure_production "$env_file"
validate_compose_files
ensure_infrastructure_healthy
prepare_backup_root "$safety_backup_root"
require_command tar
app_image="$(dotenv_value APP_IMAGE newsletter-tool:production)"

info 'Validating the production image required after restoration'
validate_production_image "$app_image"

info 'Verifying backup checksums and archive structure'
checksum_verify "$backup_directory"
"${INFRA_COMPOSE[@]}" exec -T db pg_restore --list \
  < "$backup_directory/database.dump" >/dev/null
tar -tzf "$backup_directory/assets.tar.gz" >/dev/null

info 'Creating mandatory safety backup of the current state'
"$SCRIPT_DIR/backup-production.sh" --env-file "$ENV_FILE" --backup-dir "$BACKUP_ROOT"

restore_assets_directory="$(mktemp -d "${TMPDIR:-/tmp}/newsletter-assets-restore.XXXXXX")"
cleanup() {
  if [[ -n "${restore_assets_directory:-}" && -d "$restore_assets_directory" && "$restore_assets_directory" == "${TMPDIR:-/tmp}/newsletter-assets-restore."* ]]; then
    rm -rf -- "$restore_assets_directory"
  fi
}
trap cleanup EXIT

tar -xzf "$backup_directory/assets.tar.gz" -C "$restore_assets_directory"

info 'Stopping application containers gracefully; persistent infrastructure remains online'
"${APP_COMPOSE[@]}" stop --timeout 30 web audit-cleanup

info 'Restoring PostgreSQL database'
if ! "${INFRA_COMPOSE[@]}" exec -T db sh -c \
  'pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' \
  < "$backup_directory/database.dump"; then
  die "Database restore failed. Application containers remain stopped. Use the safety backup in $BACKUP_ROOT for recovery."
fi

info 'Creating or validating the asset bucket'
"${APP_COMPOSE[@]}" run --rm --no-deps createbucket

info 'Restoring MinIO assets without deleting newer unreferenced objects'
"${APP_COMPOSE[@]}" run --rm --no-deps \
  --volume "$restore_assets_directory:/restore:ro" \
  --entrypoint /bin/sh \
  createbucket \
  -c 'set -eu; mc alias set target http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null; mc mirror --overwrite /restore "target/$S3_BUCKET"'

info 'Applying current migrations and validating administrator bootstrap state'
"${APP_COMPOSE[@]}" run --rm --no-deps migrate
"${APP_COMPOSE[@]}" run --rm --no-deps bootstrap-admin

info 'Starting application containers and waiting for health checks'
"${APP_COMPOSE[@]}" up \
  --detach \
  --no-deps \
  --force-recreate \
  --wait \
  --wait-timeout 120 \
  web audit-cleanup

cleanup
restore_assets_directory=''
trap - EXIT
info "Restore completed successfully from: $backup_directory"
