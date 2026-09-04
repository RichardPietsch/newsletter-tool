#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=./_production-common.sh
source "$SCRIPT_DIR/_production-common.sh"

env_file="$PROJECT_ROOT/.env.production"
backup_root=''
include_infrastructure=false

usage() {
  cat <<'EOF'
Usage: ./scripts/stop-production.sh [options]

Options:
  --env-file PATH          Production environment file (default: .env.production)
  --include-infrastructure
                           Also stop MinIO and PostgreSQL after a mandatory backup
  --backup-dir PATH        Required together with --include-infrastructure
  --help                   Show this help

Without --include-infrastructure only the disposable web and audit containers
are stopped. No container or volume is removed.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      [[ $# -ge 2 ]] || die '--env-file requires a path.'
      env_file="$2"
      shift 2
      ;;
    --include-infrastructure)
      include_infrastructure=true
      shift
      ;;
    --backup-dir)
      [[ $# -ge 2 ]] || die '--backup-dir requires a path.'
      backup_root="$2"
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

if [[ "$include_infrastructure" == true ]]; then
  ensure_infrastructure_healthy
  prepare_backup_root "$backup_root"
  info 'Creating mandatory backup before infrastructure shutdown'
  "$SCRIPT_DIR/backup-production.sh" --env-file "$ENV_FILE" --backup-dir "$BACKUP_ROOT"
fi

info 'Stopping application containers gracefully'
"${APP_COMPOSE[@]}" stop --timeout 30 web audit-cleanup

if [[ "$include_infrastructure" == true ]]; then
  info 'Stopping MinIO gracefully'
  "${INFRA_COMPOSE[@]}" stop --timeout 60 minio
  info 'Stopping PostgreSQL gracefully'
  "${INFRA_COMPOSE[@]}" stop --timeout 60 db
fi

info 'Containers stopped. No containers, networks, or volumes were removed.'
