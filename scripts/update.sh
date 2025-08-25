#!/usr/bin/env bash
set -euo pipefail
IMAGE="ghcr.io/abdulaziz119/workpermit-bot:latest"
NAME="workpermit_app"
NETWORK="workpermit_net"
DB_CONT="workpermit_postgres"

log(){ echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"; }

# Pull latest image
log "Pulling $IMAGE"
if ! docker pull "$IMAGE" >/dev/null; then
  log "Pull failed"; exit 1; fi

# Ensure DB container exists
if ! docker ps --format '{{.Names}}' | grep -q "^$DB_CONT$"; then
  log "Database container $DB_CONT not running"; exit 1; fi

NEW_ID=$(docker image inspect -f '{{.Id}}' "$IMAGE")
CURRENT_ID=""
if docker ps --format '{{.Names}}' | grep -q "^$NAME$"; then
  CURRENT_ID=$(docker inspect -f '{{ .Image }}' "$NAME")
fi

if [ "$NEW_ID" = "$CURRENT_ID" ]; then
  log "No change (image id same)"; exit 0; fi

log "Updating container (old=$CURRENT_ID new=$NEW_ID)"
# Recreate container
if docker ps --format '{{.Names}}' | grep -q "^$NAME$"; then
  docker rm -f "$NAME" >/dev/null || true
fi

docker run -d --name "$NAME" \
  --network "$NETWORK" \
  -e DB_HOST=$DB_CONT \
  -e DB_NAME=${DB_NAME:-workpermit_db} \
  -e DB_USER=${DB_USER:-postgres} \
  -e DB_PASSWORD=${DB_PASSWORD:-postgres123} \
  -e DB_SCHEMA=${DB_SCHEMA:-public} \
  -e NODE_ENV=production \
  -e APP_PORT=${APP_PORT:-3000} \
  -e TZ=${TZ:-Asia/Tashkent} \
  -e TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-$BOT_TOKEN}" \
  -e BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-$BOT_TOKEN}" \
  -p 3000:3000 \
  "$IMAGE"

log "Started $NAME with image $NEW_ID"
