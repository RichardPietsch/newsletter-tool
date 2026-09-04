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
require_command awk

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
database_listing="$staging_directory/database-contents.txt"
"${INFRA_COMPOSE[@]}" exec -T db pg_restore --list \
  < "$staging_directory/database.dump" > "$database_listing"

tenant_design_rows=0
tenant_design_complete_rows=0
tenant_design_current_rows=0
tenant_design_current_complete_rows=0
tenant_header_variants=0
tenant_header_corner_preferences=0
tenant_header_rounded_enabled=0
if grep -Eq '[[:space:]]TABLE[[:space:]]+public[[:space:]]+app_settings[[:space:]]' "$database_listing"; then
  grep -Eq '[[:space:]]TABLE DATA[[:space:]]+public[[:space:]]+app_settings[[:space:]]' "$database_listing" \
    || die 'PostgreSQL archive is missing tenant design data.'
  tenant_design_data="$staging_directory/tenant-design-data.sql"
  "${INFRA_COMPOSE[@]}" exec -T db pg_restore --data-only --table=public.app_settings --file=- \
    < "$staging_directory/database.dump" > "$tenant_design_data"
  design_counts="$(awk '
    function occurrences(value, needle, count, position) {
      count = 0
      while ((position = index(value, needle)) > 0) {
        count += 1
        value = substr(value, position + length(needle))
      }
      return count
    }
    /^COPY public\.app_settings / { in_copy = 1; next }
    in_copy && /^\\\.$/ { in_copy = 0; next }
    in_copy {
      total += 1
      row_headers = occurrences($0, "\"imageUrl\":")
      row_corner_preferences = occurrences($0, "\"roundedCorners\":")
      row_rounded_enabled = occurrences($0, "\"roundedCorners\": true")
      row_corner_booleans = row_rounded_enabled + occurrences($0, "\"roundedCorners\": false")
      headers += row_headers
      corner_preferences += row_corner_preferences
      rounded_enabled += row_rounded_enabled
      has_core_design = index($0, "\"schemaVersion\":") && index($0, "\"headerVariants\":") && index($0, "\"footerRichText\":") && index($0, "\"colors\":")
      is_current_version = $0 ~ /"schemaVersion":[[:space:]]*2[,}]/
      has_complete_corner_preferences = row_headers == row_corner_preferences && row_corner_preferences == row_corner_booleans
      if (has_core_design && (!is_current_version || has_complete_corner_preferences)) complete += 1
      if (is_current_version) {
        current += 1
        if (has_core_design && has_complete_corner_preferences) current_complete += 1
      }
    }
    END { printf "%d|%d|%d|%d|%d|%d|%d", total, complete, current, current_complete, headers, corner_preferences, rounded_enabled }
  ' "$tenant_design_data")"
  IFS='|' read -r \
    tenant_design_rows \
    tenant_design_complete_rows \
    tenant_design_current_rows \
    tenant_design_current_complete_rows \
    tenant_header_variants \
    tenant_header_corner_preferences \
    tenant_header_rounded_enabled \
    <<< "$design_counts"
  rm -f -- "$tenant_design_data"
  [[ "$tenant_design_current_rows" -eq "$tenant_design_current_complete_rows" ]] \
    || die "PostgreSQL archive contains incomplete current tenant design data ($tenant_design_current_complete_rows of $tenant_design_current_rows current rows complete)."
fi
rm -f -- "$database_listing"

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
tenant_design_rows=$tenant_design_rows
tenant_design_complete_rows=$tenant_design_complete_rows
tenant_design_current_rows=$tenant_design_current_rows
tenant_design_current_complete_rows=$tenant_design_current_complete_rows
tenant_header_variants=$tenant_header_variants
tenant_header_corner_preferences=$tenant_header_corner_preferences
tenant_header_rounded_enabled=$tenant_header_rounded_enabled
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
