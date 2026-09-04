#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=./_production-common.sh
source "$SCRIPT_DIR/_production-common.sh"

env_file="$PROJECT_ROOT/.env.production"
backup_root=''

usage() {
  cat <<'EOF'
Usage: ./scripts/backup-production.sh --backup-dir PATH [options]

Options:
  --backup-dir PATH  Destination on an off-server or separately backed-up mount
  --env-file PATH    Production environment file (default: .env.production)
  --help             Show this help
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
require_command tar

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
final_directory="$BACKUP_ROOT/$timestamp"
staging_directory="$(mktemp -d "$BACKUP_ROOT/.incomplete-$timestamp.XXXXXX")"
assets_directory="$staging_directory/assets"

cleanup() {
  if [[ -n "${staging_directory:-}" && -d "$staging_directory" && "$staging_directory" == "$BACKUP_ROOT/.incomplete-"* ]]; then
    rm -rf -- "$staging_directory"
  fi
}
trap cleanup EXIT

mkdir -p -- "$assets_directory"

info 'Creating a consistent PostgreSQL archive'
"${INFRA_COMPOSE[@]}" exec -T db sh -c \
  'pg_dump --format=custom --no-owner --no-privileges --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' \
  > "$staging_directory/database.dump"

info 'Validating the PostgreSQL archive'
"${INFRA_COMPOSE[@]}" exec -T db pg_restore --list \
  < "$staging_directory/database.dump" >/dev/null

info 'Mirroring MinIO assets into the backup'
"${APP_COMPOSE[@]}" run --rm --no-deps \
  --volume "$assets_directory:/backup" \
  --entrypoint /bin/sh \
  createbucket \
  -c 'set -eu; mc alias set source http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null; mc mirror --overwrite "source/$S3_BUCKET" /backup'

tar -C "$assets_directory" -czf "$staging_directory/assets.tar.gz" .
rm -rf -- "$assets_directory"
tar -tzf "$staging_directory/assets.tar.gz" >/dev/null

git_revision="$(git -C "$PROJECT_ROOT" rev-parse HEAD 2>/dev/null || printf unknown)"
cat > "$staging_directory/MANIFEST.txt" <<EOF
created_at_utc=$timestamp
git_revision=$git_revision
postgres_volume=$POSTGRES_VOLUME
minio_volume=$MINIO_VOLUME
EOF

checksum_create "$staging_directory" database.dump assets.tar.gz MANIFEST.txt \
  > "$staging_directory/SHA256SUMS"
checksum_verify "$staging_directory" >/dev/null

[[ ! -e "$final_directory" ]] || die "Backup destination already exists: $final_directory"
mv -- "$staging_directory" "$final_directory"
staging_directory=''
trap - EXIT

info "Backup completed and validated: $final_directory"
printf '%s\n' "$final_directory"
