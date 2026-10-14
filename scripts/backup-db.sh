#!/usr/bin/env bash
set -euo pipefail
# Usage: bash scripts/backup-db.sh prod /secure/prod.env /backup/directory
# This writes a database dump, not an off-site backup by itself.
environment=${1:?Specify dev, stage, or prod}
env_file=${2:?Specify an absolute environment file path}
backup_directory=${3:?Specify an absolute backup directory}
case "$environment" in dev|stage|prod) ;; *) echo 'Unknown environment' >&2; exit 1 ;; esac
case "$env_file" in /*) ;; *) echo 'Environment file path must be absolute' >&2; exit 1 ;; esac
case "$backup_directory" in /*) ;; *) echo 'Backup directory must be absolute' >&2; exit 1 ;; esac
project_directory=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
umask 077
mkdir -p -- "$backup_directory"
temporary_dump=$(mktemp "$backup_directory/.taskist-$environment.XXXXXX")
trap 'rm -f -- "$temporary_dump"' EXIT
docker compose --project-directory "$project_directory" -f "$project_directory/compose.yaml" -p "lab-$environment" --env-file "$env_file" exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$temporary_dump"
# Verify the archive is readable before naming it a successful backup.
docker compose --project-directory "$project_directory" -f "$project_directory/compose.yaml" -p "lab-$environment" --env-file "$env_file" exec -T db pg_restore --list < "$temporary_dump" > /dev/null
final_dump="$backup_directory/taskist-$environment-$(date -u +%Y%m%dT%H%M%SZ)-${temporary_dump##*.}.dump"
mv -- "$temporary_dump" "$final_dump"
printf 'Backup written: %s\n' "$final_dump"
