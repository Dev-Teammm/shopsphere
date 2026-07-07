#!/usr/bin/env bash

set -euo pipefail

APP_NAME="${APP_NAME:-shopsphere-api}"
APP_DIR="${APP_DIR:-/opt/apps/shopsphere_api}"
CONFIG_DIR="${CONFIG_DIR:-/opt/configs/shopsphere_api}"
JAR_SOURCE="${JAR_SOURCE:-target/ecom-app-0.0.1-SNAPSHOT.jar}"
JAR_TARGET="${JAR_TARGET:-$APP_DIR/shopsphere-api.jar}"
ENV_FILE="${ENV_FILE:-$CONFIG_DIR/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE"
  exit 1
fi

if [[ ! -f "$JAR_SOURCE" ]]; then
  echo "Build artifact not found: $JAR_SOURCE"
  exit 1
fi

mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/logs"

cp "$JAR_SOURCE" "$JAR_TARGET"

set -a
source "$ENV_FILE"
set +a

if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 is required on the self-hosted runner."
  exit 1
fi

PM2_CMD=(
  pm2
  start
  "$JAR_TARGET"
  --name "$APP_NAME"
  --cwd "$APP_DIR"
  --interpreter java
  --interpreter-args "-jar"
  --time
  --update-env
)

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  "${PM2_CMD[@]}"
fi

pm2 save
